import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, PermissionsAndroid } from 'react-native';
import Mapbox, { MapView, Camera, UserLocation, StyleURL, ShapeSource, LineLayer, PointAnnotation } from '@rnmapbox/maps';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../theme/theme';
import axios from 'axios';

// Mapbox Token Initialization
Mapbox.setAccessToken('MAPBOX_PUBLIC_TOKEN_PLACEHOLDER');

const BACKEND_URL = 'http://192.168.29.99:8000';
const BACKEND_WS = 'ws://192.168.29.99:8000/ws/alerts';

export const SafeMapView = () => {
  const { 
    userLocation, destination, setUserLocation, 
    routes, setRoutes, activeRoute, sosAlerts, addSosAlert 
  } = useStore();
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    // Request location permission
    const requestLocationPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Location permission denied');
          }
        } catch (err) {
          console.warn(err);
        }
      }
    };
    requestLocationPermission();

    const ws = new WebSocket(BACKEND_WS);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'sos') {
        addSosAlert({ id: data.id, location: data.location });
      }
    };
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (userLocation && destination) {
      fetchRoutes();
    }
  }, [destination]);

  const fetchRoutes = async () => {
    if (!userLocation || !destination) return;
    
    try {
      const res = await axios.get(`${BACKEND_URL}/routes`, {
        params: {
          start_lng: userLocation[0],
          start_lat: userLocation[1],
          end_lng: destination[0],
          end_lat: destination[1]
        }
      });
      
      if (res.data.error) {
        console.error('Backend routing error:', res.data.error);
        return;
      }

      setRoutes({ 
        fastest: res.data.fastest_route, 
        safest: res.data.safest_route 
      });
      
      cameraRef.current?.fitBounds(
        userLocation,
        destination,
        [50, 50, 50, 50],
        1000
      );
    } catch (error) {
      console.error('Fetch routes error:', error);
    }
  };

  const onUserLocationUpdate = (location: any) => {
    const { longitude, latitude } = location.coords;
    setUserLocation([longitude, latitude]);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        styleURL={StyleURL.Dark}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          ref={cameraRef}
          zoomLevel={15}
          centerCoordinate={userLocation || [-74.0060, 40.7128]} // Default to NYC instead of ocean [0,0]
          animationMode="flyTo"
          animationDuration={2000}
        />

        {routes?.fastest && (
          <ShapeSource id="fastestSource" shape={routes.fastest}>
            <LineLayer
              id="fastestLayer"
              style={{
                lineColor: COLORS.secondary,
                lineWidth: activeRoute === 'fastest' ? 6 : 4,
                lineOpacity: activeRoute === 'fastest' ? 1 : 0.5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </ShapeSource>
        )}

        {routes?.safest && (
          <ShapeSource id="safestSource" shape={routes.safest}>
            <LineLayer
              id="safestLayer"
              style={{
                lineColor: COLORS.primary,
                lineWidth: activeRoute === 'safest' ? 6 : 4,
                lineOpacity: activeRoute === 'safest' ? 1 : 0.5,
                lineCap: 'round',
                lineJoin: 'round',
                lineBlur: activeRoute === 'safest' ? 2 : 0, // Glowing effect
              }}
            />
          </ShapeSource>
        )}

        {sosAlerts.map((alert) => (
          <PointAnnotation
            key={alert.id}
            id={alert.id}
            coordinate={alert.location}
          >
            <View style={styles.pulseContainer}>
              <View style={styles.pulseInner} />
            </View>
          </PointAnnotation>
        ))}

        <UserLocation
          visible={true}
          onUpdate={onUserLocationUpdate}
          showsUserHeadingIndicator={true}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  map: {
    flex: 1,
  },
  pulseContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
    borderWidth: 2,
    borderColor: '#FFF',
  },
});
