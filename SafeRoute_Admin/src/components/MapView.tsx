import React, { useRef, useEffect, useState } from 'react';
import Map, { Marker, NavigationControl, Source, Layer, type MapRef, type LayerProps } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useStore } from '../store/useStore';
import { AlertCircle, ShieldAlert, Navigation2 } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Commuter {
  userId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  lastUpdated: number;
}

const heatmapLayer: LayerProps = {
  id: 'historical-incidents-heatmap',
  type: 'heatmap',
  paint: {
    // Read the exposure_level property from GeoJSON to calculate weight
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['coalesce', ['get', 'exposure_level'], 1],
      0, 0,
      10, 1
    ],
    // Adjust heatmap intensity by zoom level
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 1,
      15, 3
    ],
    // Danger gradient: transparent/light blue -> orange -> solid red
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0, 128, 255, 0)',        // Transparent low density
      0.2, 'rgba(0, 128, 255, 0.4)',     // Light blue
      0.6, 'rgba(255, 165, 0, 0.8)',      // Orange (medium density)
      1.0, 'rgba(220, 38, 38, 1)'        // Solid red (high density)
    ],
    // Heatmap radius zoom scaling (radius 2 at zoom 0, radius 25 at zoom 15)
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0, 2,
      15, 25
    ],
    // Set general opacity
    'heatmap-opacity': 0.85
  }
};


const MapView: React.FC = () => {
  const mapRef = useRef<MapRef>(null);
  const { alerts, focusedLocation, setFocusedLocation, resolveAlert } = useStore();
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const { triggerCustomAlert } = useWebSocket();

  // Active Patrol Responders State
  const [patrols, setPatrols] = useState<any[]>([]);
  // Heatmap GeoJSON Data State
  const [heatmapData, setHeatmapData] = useState<any>(null);
  // Active Commuters Telemetry State
  const [commuters, setCommuters] = useState<Record<string, Commuter>>({});
  // Map Visualization Mode ('operational' | 'trend')
  const [mapMode, setMapMode] = useState<'operational' | 'trend'>('operational');

  // WebSocket Connection for Admin Telemetry
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;
      const wsUrl = import.meta.env.VITE_BACKEND_WS_URL || 'ws://20.40.61.11:8000/ws/sos';
      console.log('Connecting admin telemetry WebSocket to:', wsUrl);
      
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.event === 'telemetry_update' && payload.data) {
            const data = payload.data;
            setCommuters((prev) => ({
              ...prev,
              [data.user_id]: {
                userId: data.user_id,
                latitude: data.latitude,
                longitude: data.longitude,
                speed: data.speed || 0,
                heading: data.heading || 0,
                lastUpdated: Date.now()
              }
            }));
          } else if (payload.user_id && payload.latitude !== undefined && payload.longitude !== undefined) {
            setCommuters((prev) => ({
              ...prev,
              [payload.user_id]: {
                userId: payload.user_id,
                latitude: payload.latitude,
                longitude: payload.longitude,
                speed: payload.speed || 0,
                heading: payload.heading || 0,
                lastUpdated: Date.now()
              }
            }));
          }
        } catch (err) {
          console.error('Failed to parse admin telemetry WS message:', err);
        }
      };

      ws.onclose = () => {
        if (ws) {
          ws.onmessage = null;
          ws.onclose = null;
          ws.onerror = null;
        }
        if (isMounted) {
          console.log('Admin telemetry WS disconnected. Reconnecting in 5s...');
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };

      ws.onerror = (err) => {
        console.error('Admin telemetry WS error:', err);
        ws?.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (ws) {
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Telemetry dynamic pruning timer (15s inactivity)
  useEffect(() => {
    const pruneInterval = setInterval(() => {
      const now = Date.now();
      setCommuters((prev) => {
        const updated = { ...prev };
        let changed = false;
        for (const [id, commuter] of Object.entries(updated)) {
          if (now - commuter.lastUpdated > 15000) {
            delete updated[id];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 5000);

    return () => clearInterval(pruneInterval);
  }, []);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL || 'http://20.40.61.11:8000'}/api/analytics/heatmap`);
        if (!response.ok) {
          throw new Error('Failed to fetch heatmap data');
        }
        const data = await response.json();
        setHeatmapData(data);
      } catch (error) {
        console.error('Error fetching heatmap data:', error);
      }
    };
    fetchHeatmapData();
  }, []);

  useEffect(() => {
    if (focusedLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [focusedLocation.lng, focusedLocation.lat],
        zoom: 15,
        duration: 2000,
        essential: true
      });
      // Clear focused location after flying
      setTimeout(() => setFocusedLocation(null), 2500);
    }
  }, [focusedLocation, setFocusedLocation]);

  const dispatchPatrol = (alert: any) => {
    // Generate a starting point offset from the alert (approx 1km away)
    const startLat = alert.location.lat - 0.008;
    const startLng = alert.location.lng + 0.008;
    const patrolId = `patrol_${Date.now()}`;

    const newPatrol = {
      id: patrolId,
      lat: startLat,
      lng: startLng,
      targetLat: alert.location.lat,
      targetLng: alert.location.lng,
      alertId: alert.userId,
      progress: 0
    };

    setPatrols((prev) => [...prev, newPatrol]);

    // Animate patrol towards alert over 4 seconds
    const duration = 4000; 
    const intervalTime = 50; 
    const steps = duration / intervalTime;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const t = step / steps; // progress percentage

      setPatrols((prev) => 
        prev.map((p) => {
          if (p.id === patrolId) {
            return {
              ...p,
              lat: startLat + (p.targetLat - startLat) * t,
              lng: startLng + (p.targetLng - startLng) * t,
              progress: t
            };
          }
          return p;
        })
      );

      if (step >= steps) {
        clearInterval(timer);
        // Patrol unit arrived! Resolve/clear the alert in Zustand store
        resolveAlert(alert.userId, alert.timestamp);

        // Fade out/remove patrol after 1.5 seconds of arrival
        setTimeout(() => {
          setPatrols((prev) => prev.filter((p) => p.id !== patrolId));
        }, 1500);
      }
    }, intervalTime);
  };

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
      {/* Floating Map Controller Button Overlay */}
      <div className="absolute top-4 right-16 z-50 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-1.5 rounded-2xl flex items-center space-x-1 shadow-2xl">
        <button
          onClick={() => setMapMode('operational')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
            mapMode === 'operational'
              ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Operational
        </button>
        <button
          onClick={() => setMapMode('trend')}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all duration-300 cursor-pointer ${
            mapMode === 'trend'
              ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Historical Trends
        </button>
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          longitude: 78.4026,
          latitude: 17.4849,
          zoom: 12
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        onClick={(e) => {
          if (e.originalEvent.altKey || e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
            const { lng, lat } = e.lngLat;
            triggerCustomAlert(lat, lng);
          }
        }}
      >
        <NavigationControl position="top-right" />

        {/* Dark Dimming Background Layer to strip away distracting street details in Trend mode */}
        {mapMode === 'trend' && (
          <Source id="dim-overlay" type="geojson" data={{ type: 'FeatureCollection', features: [] }}>
            <Layer
              id="dim-layer"
              type="background"
              paint={{
                'background-color': '#09090b',
                'background-opacity': 0.55
              }}
            />
          </Source>
        )}

        {/* Historical SOS Heatmap Layer */}
        {heatmapData && (
          <Source id="historical-heatmap-source" type="geojson" data={heatmapData}>
            <Layer 
              id="historical-incidents-heatmap"
              type="heatmap"
              layout={{
                visibility: mapMode === 'trend' ? 'visible' : 'none'
              }}
              paint={{
                ...heatmapLayer.paint,
                'heatmap-opacity': mapMode === 'trend' ? 0.3 : 0.0
              }}
            />
          </Source>
        )}

        {/* Pulse Markers for SOS Alerts */}
        {alerts.map((alert, index) => (
          <Marker
            key={`${alert.userId}-${alert.timestamp}-${index}`}
            longitude={alert.location.lng}
            latitude={alert.location.lat}
            anchor="bottom"
          >
            <div className="relative group cursor-pointer z-40">
              {/* Pulsing rings */}
              <div className="absolute -inset-4 bg-red-500/30 rounded-full animate-ping" />
              <div className="absolute -inset-8 bg-red-500/10 rounded-full animate-pulse" />
              
              {/* Main Marker Icon */}
              <div className="relative bg-red-600 p-2 rounded-full border-2 border-white shadow-[0_0_20px_rgba(220,38,38,0.5)] group-hover:scale-110 transition-transform">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>

              {/* Tooltip on Hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
                <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Active Alert</p>
                  <p className="text-xs font-bold text-white mb-1">ID: {alert.userId.slice(0, 8)}</p>
                  <p className="text-[10px] text-zinc-400 font-mono mb-2">
                    {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatchPatrol(alert);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg w-full transition-colors cursor-pointer shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                  >
                    DISPATCH PATROL
                  </button>
                </div>
                <div className="w-3 h-3 bg-zinc-900 border-r border-b border-zinc-700 rotate-45 mx-auto -mt-1.5" />
              </div>
            </div>
          </Marker>
        ))}

        {/* Active Patrol Responders */}
        {patrols.map((patrol) => (
          <Marker 
            key={patrol.id} 
            latitude={patrol.lat} 
            longitude={patrol.lng}
          >
            <div className={`relative group cursor-pointer z-30 transition-opacity duration-500 ${mapMode === 'trend' ? 'opacity-20' : 'opacity-100'}`}>
              {/* Glowing radar pulses */}
              <div className="absolute -inset-3 bg-blue-500/20 rounded-full animate-ping" />
              
              {/* Responder Shield Indicator */}
              <div className="relative bg-blue-600 p-2 rounded-full border-2 border-white shadow-[0_0_15px_rgba(37,99,235,0.6)]">
                <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
              </div>
              
              {/* Dynamic Status Text */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-blue-950/95 text-[8px] font-bold text-blue-400 border border-blue-500/30 px-2 py-1 rounded-md whitespace-nowrap shadow-md backdrop-blur-sm">
                PATROL RESPONDING ({Math.round(patrol.progress * 100)}%)
              </div>
            </div>
          </Marker>
        ))}

        {/* Active Commuter Markers */}
        {Object.values(commuters).map((commuter) => (
          <Marker
            key={commuter.userId}
            longitude={commuter.longitude}
            latitude={commuter.latitude}
            anchor="center"
          >
            <div className={`relative group cursor-pointer z-30 transition-opacity duration-500 ${mapMode === 'trend' ? 'opacity-20' : 'opacity-100'}`}>
              {/* Telemetry Indicator with Dynamic Rotation */}
              <div 
                className="bg-zinc-950 p-2 rounded-full border border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-transform duration-500 ease-out hover:scale-110"
                style={{ transform: `rotate(${commuter.heading}deg)` }}
              >
                <Navigation2 className="w-4 h-4 text-blue-400 fill-blue-500/20" />
              </div>

              {/* Hover Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-zinc-900 border border-zinc-700 p-2.5 rounded-xl shadow-xl backdrop-blur-md flex flex-col items-center">
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Commuter Feed</p>
                  <p className="text-[10px] font-bold text-white mb-1">ID: {commuter.userId.slice(0, 8)}</p>
                  <div className="flex flex-col items-center space-y-0.5 text-[9px] text-zinc-400 font-mono">
                    <p>Speed: {Math.round(commuter.speed * 3.6)} km/h</p>
                    <p>Heading: {Math.round(commuter.heading)}°</p>
                  </div>
                  <div className="flex items-center space-x-1 mt-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Live Sync</span>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 bg-zinc-900 border-r border-b border-zinc-700 rotate-45 mx-auto -mt-1" />
              </div>
            </div>
          </Marker>
        ))}

        {/* Static Legend Overlay */}
        <div className="absolute bottom-8 left-8 p-4 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-2xl space-y-3 shadow-2xl">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Map Legend</p>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
            <span className="text-xs font-semibold text-zinc-300">Active SOS Incident</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3.5 h-3.5 bg-blue-600 rounded-full animate-pulse flex items-center justify-center shadow-[0_0_8px_rgba(37,99,235,0.8)]">
              <ShieldAlert className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-zinc-300">
              Patrol Responders {patrols.length > 0 ? `(${patrols.length} Active)` : '(Idle)'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3.5 h-3.5 bg-zinc-950 border border-blue-500 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(59,130,246,0.5)]">
              <Navigation2 className="w-2.5 h-2.5 text-blue-400 fill-blue-400/20" />
            </div>
            <span className="text-xs font-semibold text-zinc-300">
              Active Commuters {Object.keys(commuters).length > 0 ? `(${Object.keys(commuters).length} Active)` : '(None)'}
            </span>
          </div>
          <div className="pt-2 border-t border-zinc-800/60">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Danger Density</p>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-blue-400">Low</span>
              <div className="h-2 w-24 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-600 shadow-[0_0_8px_rgba(239,68,68,0.2)]" />
              <span className="text-[10px] text-red-500">High</span>
            </div>
          </div>
        </div>
      </Map>
    </div>
  );
};

export default MapView;
