import React, { useRef, useEffect } from 'react';
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useStore } from '../store/useStore';
import { AlertCircle } from 'lucide-react';

const MapView: React.FC = () => {
  const mapRef = useRef<MapRef>(null);
  const { alerts, focusedLocation, setFocusedLocation } = useStore();
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

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

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl">
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
      >
        <NavigationControl position="top-right" />

        {/* Pulse Markers for SOS Alerts */}
        {alerts.map((alert, index) => (
          <Marker
            key={`${alert.userId}-${alert.timestamp}-${index}`}
            longitude={alert.location.lng}
            latitude={alert.location.lat}
            anchor="bottom"
          >
            <div className="relative group cursor-pointer">
              {/* Pulsing rings */}
              <div className="absolute -inset-4 bg-red-500/30 rounded-full animate-ping" />
              <div className="absolute -inset-8 bg-red-500/10 rounded-full animate-pulse" />
              
              {/* Main Marker Icon */}
              <div className="relative bg-red-600 p-2 rounded-full border-2 border-white shadow-[0_0_20px_rgba(220,38,38,0.5)] group-hover:scale-110 transition-transform">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>

              {/* Tooltip on Hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Active Alert</p>
                  <p className="text-xs font-bold text-white mb-1">ID: {alert.userId.slice(0, 8)}</p>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                  </p>
                </div>
                <div className="w-3 h-3 bg-zinc-900 border-r border-b border-zinc-700 rotate-45 mx-auto -mt-1.5" />
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
            <div className="w-3 h-3 bg-blue-500 rounded-full opacity-50" />
            <span className="text-xs font-semibold text-zinc-300">Patrol Unit (Offline)</span>
          </div>
        </div>
      </Map>
    </div>
  );
};

export default MapView;
