import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useAppStore } from '../store/useAppStore';
import { FASTEST_ROUTE, SAFEST_ROUTE } from '../utils/mockData';

export const MapScreen = () => {
    const { activeRoute } = useAppStore();
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                // Fallback location if denied (SF)
                setUserLocation({ latitude: 37.7749, longitude: -122.4194 });
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        })();
    }, []);

    if (!userLocation) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF3B30" />
                <Text style={styles.loadingText}>Acquiring GPS Signal...</Text>
            </View>
        );
    }

    // Leaflet requires [lat, lng] format
    const fastestLeaflet = FASTEST_ROUTE.map(p => [p.latitude, p.longitude]);
    const safestLeaflet = SAFEST_ROUTE.map(p => [p.latitude, p.longitude]);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Leaflet Map</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
            body { padding: 0; margin: 0; background-color: #000; }
            html, body, #map { height: 100%; width: 100vw; }
            .leaflet-layer,
            .leaflet-control-zoom-in,
            .leaflet-control-zoom-out,
            .leaflet-control-attribution {
              filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
            }
            /* Custom pulsing animation for the user marker */
            .user-marker {
                background-color: #2196F3;
                border-radius: 50%;
                border: 3px solid #FFF;
                box-shadow: 0 0 15px #2196F3;
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 15px rgba(33, 150, 243, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(33, 150, 243, 0); }
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            var userLat = ${userLocation.latitude};
            var userLng = ${userLocation.longitude};

            // Initialize map centered on USER'S ACTUAL LOCATION
            var map = L.map('map', {zoomControl: false}).setView([userLat, userLng], 14);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            // Add a custom HTML marker for the user's live location
            var userIcon = L.divIcon({
                className: 'user-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            L.marker([userLat, userLng], {icon: userIcon}).addTo(map).bindPopup("You are here").openPopup();

            var activeRoute = "${activeRoute}";
            var fastestCoords = ${JSON.stringify(fastestLeaflet)};
            var safestCoords = ${JSON.stringify(safestLeaflet)};

            // Optional: Still draw the mock routing lines (they might be far away if you are not in SF)
            if (activeRoute === 'fastest') {
                L.polyline(fastestCoords, {color: '#2196F3', weight: 6, dashArray: '10, 10'}).addTo(map);
            } else {
                L.polyline(safestCoords, {color: '#4CAF50', weight: 6, dashArray: '10, 10'}).addTo(map);
            }
        </script>
    </body>
    </html>
    `;

    return (
        <View style={styles.container}>
            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
            <WebView
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                style={styles.map}
                scrollEnabled={false}
                bounces={false}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFF',
        marginTop: 15,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    errorText: {
        color: '#FF3B30',
        position: 'absolute',
        top: 40,
        alignSelf: 'center',
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 5,
        borderRadius: 5,
    }
});
