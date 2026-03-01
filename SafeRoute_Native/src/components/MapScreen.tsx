import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Heatmap, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAppStore } from '../store/useAppStore';
import { MOCK_USER_LOCATION, HEATMAP_POINTS, FASTEST_ROUTE, SAFEST_ROUTE } from '../utils/mockData';

export const MapScreen = () => {
    const { activeRoute } = useAppStore();

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={MOCK_USER_LOCATION}
                // Use PROVIDER_GOOGLE if available/configured, otherwise default
                provider={PROVIDER_GOOGLE}
                showsUserLocation={false}
            >
                {/* Heatmap Layer */}
                <Heatmap
                    points={HEATMAP_POINTS as any}
                    radius={50}
                    opacity={0.6}
                    gradient={{
                        colors: ['#00000000', '#FFFF00', '#FF0000'],
                        startPoints: [0, 0.5, 1],
                        colorMapSize: 256,
                    }}
                />

                {/* Dynamic Route Polyline */}
                {activeRoute === 'fastest' ? (
                    <Polyline
                        coordinates={FASTEST_ROUTE}
                        strokeColor="#2196F3" // Blue for fastest
                        strokeWidth={4}
                        lineDashPattern={[1]}
                    />
                ) : (
                    <Polyline
                        coordinates={SAFEST_ROUTE}
                        strokeColor="#4CAF50" // Green for safest Detour
                        strokeWidth={4}
                        lineDashPattern={[1]}
                    />
                )}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
});
