import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// Import leaflet base CSS
import 'leaflet/dist/leaflet.css';

// Fix typical react-leaflet custom marker icon issue
const customIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Mock markers for "User Unsafe Reports"
const incidentMarkers = [
    { id: 1, lat: 40.7128, lng: -74.0060, title: 'Poor street lighting reported', time: '9:15 PM' },
    { id: 2, lat: 40.7200, lng: -74.0100, title: 'Suspicious individual loitering', time: '9:42 PM' },
    { id: 3, lat: 40.7150, lng: -73.9950, title: 'Multiple users hit SOS', time: '10:05 PM' },
    { id: 4, lat: 40.7050, lng: -74.0150, title: 'Construction blocked pedestrian path', time: '8:30 PM' },
    { id: 5, lat: 40.7250, lng: -73.9900, title: 'Lack of CCTV coverage noted', time: '11:00 PM' },
];

// Mock Danger Zones (Heatmap approximation)
const dangerZones = [
    { id: 'zone1', lat: 40.7180, lng: -74.0010, radius: 450, color: '#ef4444' }, // Red (High risk)
    { id: 'zone2', lat: 40.7100, lng: -73.9900, radius: 600, color: '#f97316' }, // Orange
    { id: 'zone3', lat: 40.7220, lng: -74.0120, radius: 300, color: '#ef4444' }, // Red
    { id: 'zone4', lat: 40.7020, lng: -74.0080, radius: 500, color: '#f59e0b' }, // Amber
];


interface MapViewProps {
    lambda: number;
}

const MapView: React.FC<MapViewProps> = ({ lambda }) => {
    const mapRef = useRef<L.Map>(null);

    // We slightly shift the view based on lambda to give a feeling of "recalculating" (mock interaction)
    useEffect(() => {
        if (mapRef.current) {
            // Just a mock interaction effect: slightly pan map when lambda changes drastically
            // In a real app, this would recalculate and redraw polylines.
            const map = mapRef.current;
            const zoom = map.getZoom();
            map.setView([40.7128 + (lambda / 500000), -74.0060], zoom, { animate: true });
        }
    }, [lambda]);

    return (
        <div className="absolute inset-0 z-0 bg-zinc-900 overflow-hidden">
            <MapContainer
                center={[40.7128, -74.0060]}
                zoom={14}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                ref={mapRef}
            >
                {/* Dark Mode CartoDB tiles */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Render proxy "heatmap" via circles */}
                {dangerZones.map(zone => (
                    <Circle
                        key={zone.id}
                        center={[zone.lat, zone.lng]}
                        pathOptions={{
                            color: zone.color,
                            fillColor: zone.color,
                            fillOpacity: 0.2 + (lambda / 5000) * 0.2, // Visual change reacting to lambda
                            weight: 0
                        }}
                        radius={zone.radius}
                    />
                ))}

                {/* Render Incident Markers */}
                {incidentMarkers.map(incident => (
                    <Marker
                        key={incident.id}
                        position={[incident.lat, incident.lng]}
                        icon={customIcon}
                    >
                        <Popup className="custom-popup">
                            <div className="p-1">
                                <div className="flex items-center space-x-2 mb-2">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                    <h3 className="font-bold text-sm text-zinc-100">User Report</h3>
                                </div>
                                <p className="text-xs text-zinc-300 mb-1">{incident.title}</p>
                                <div className="text-[10px] text-zinc-500 flex justify-between pt-2 mt-2 border-t border-zinc-700">
                                    <span>Reported at:</span>
                                    <span className="font-mono text-zinc-400">{incident.time}</span>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Map Overlay Controls / Vignette frame */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-[400]"></div>
        </div>
    );
};

export default MapView;
