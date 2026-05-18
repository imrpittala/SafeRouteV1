import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, PermissionsAndroid, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import Mapbox, { MapView, Camera, UserLocation, StyleURL, ShapeSource, LineLayer, PointAnnotation } from '@rnmapbox/maps';
import { LocateFixed } from 'lucide-react-native';
import { useStore } from '../../store/useStore';
import { COLORS, SPACING } from '../../theme/theme';
import axios from 'axios';
import { MOCK_ROUTES } from './mockRouteData';

const USE_MOCK = false; // Set to false to connect to your live FastAPI backend

// Mapbox Token Initialization
Mapbox.setAccessToken('MAPBOX_PUBLIC_TOKEN_PLACEHOLDER');

const BACKEND_URL = 'http://192.168.29.99:8000';
const BACKEND_WS = 'ws://192.168.29.99:8000/ws/sos';

export const SafeMapView = () => {
  const { 
    userLocation, destination, setUserLocation, 
    routes, setRoutes, activeRoute, sosAlerts, addSosAlert,
    isLoading, setIsLoading, isNavigating
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

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      console.log('Connecting mobile map listener to WS:', BACKEND_WS);
      ws = new WebSocket(BACKEND_WS);

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'SOS') {
            addSosAlert({ 
              id: data.userId, 
              location: [data.location.lng, data.location.lat] 
            });
          }
        } catch (err) {
          console.error('Failed to parse map WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('Mobile map WS disconnected. Retrying connection in 5s...');
        reconnectTimeout = setTimeout(connectWS, 5000);
      };

      ws.onerror = (err) => {
        console.error('Mobile map WS error:', err);
        ws?.close();
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  useEffect(() => {
    if (userLocation && destination) {
      fetchRoutes();
    }
  }, [destination]);

  const fetchRoutes = async () => {
    if (!userLocation || !destination) return;
    
    setIsLoading(true);
    
    if (USE_MOCK) {
      setTimeout(() => {
        setRoutes(MOCK_ROUTES);
        cameraRef.current?.fitBounds(
          userLocation,
          destination,
          [50, 50, 50, 50],
          1000
        );
        setIsLoading(false);
      }, 500);
      return;
    }

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
    } finally {
      setIsLoading(false);
    }
  };

  const onUserLocationUpdate = (location: any) => {
    const { longitude, latitude } = location.coords;
    setUserLocation([longitude, latitude]);
  };

  const getMidpoint = (routeData: any) => {
    if (!routeData?.geometry?.coordinates?.length) return null;
    const coords = routeData.geometry.coordinates;
    return coords[Math.floor(coords.length / 2)];
  };

  const getETA = (routeData: any) => {
    if (!routeData?.properties?.weight) return '';
    return `${Math.round(routeData.properties.weight / 60)} min`;
  };

  const fastestMid = getMidpoint(routes?.fastest);
  const safestMid = getMidpoint(routes?.safest);
  const isSameRoute = fastestMid && safestMid && fastestMid[0] === safestMid[0] && fastestMid[1] === safestMid[1];

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
          zoomLevel={isNavigating ? 18 : 15}
          pitch={isNavigating ? 60 : 0}
          centerCoordinate={userLocation || [-74.0060, 40.7128]}
          animationMode="flyTo"
          animationDuration={1000}
          followUserLocation={isNavigating ? true : undefined}
          followUserMode={isNavigating ? "course" as any : undefined}
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

        {/* Floating Time Tags for Routes (Only when not navigating) */}
        {!isNavigating && fastestMid && (
          <PointAnnotation
            key="fastest-tag"
            id="fastest-tag"
            coordinate={fastestMid}
          >
            <TouchableOpacity 
              style={[
                styles.timeTag, 
                activeRoute === 'fastest' ? styles.timeTagActiveFastest : styles.timeTagInactive
              ]}
              onPress={() => useStore.getState().setActiveRoute('fastest')}
            >
              <Text style={activeRoute === 'fastest' ? styles.timeTextActive : styles.timeTextInactive}>
                {isSameRoute ? `${getETA(routes?.fastest)} (Best)` : getETA(routes?.fastest)}
              </Text>
            </TouchableOpacity>
          </PointAnnotation>
        )}

        {!isNavigating && safestMid && !isSameRoute && (
          <PointAnnotation
            key="safest-tag"
            id="safest-tag"
            coordinate={safestMid}
          >
            <TouchableOpacity 
              style={[
                styles.timeTag, 
                activeRoute === 'safest' ? styles.timeTagActiveSafest : styles.timeTagInactive
              ]}
              onPress={() => useStore.getState().setActiveRoute('safest')}
            >
              <Text style={activeRoute === 'safest' ? styles.timeTextActive : styles.timeTextInactive}>
                {getETA(routes?.safest)}
              </Text>
            </TouchableOpacity>
          </PointAnnotation>
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
      
      {/* Recenter Button */}
      {userLocation && (
        <TouchableOpacity 
          style={[styles.recenterButton, isNavigating ? { bottom: 120 } : { bottom: destination ? 340 : 100 }]}
          onPress={() => {
            cameraRef.current?.setCamera({
              centerCoordinate: userLocation,
              zoomLevel: isNavigating ? 18 : 16,
              pitch: isNavigating ? 60 : 0,
              animationDuration: 1000,
            });
          }}
        >
          <LocateFixed color="#FFF" size={24} />
        </TouchableOpacity>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  recenterButton: {
    position: 'absolute',
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 50,
  },
  timeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  timeTagActiveFastest: {
    backgroundColor: COLORS.secondary,
    borderColor: '#FFF',
    zIndex: 100,
  },
  timeTagActiveSafest: {
    backgroundColor: COLORS.primary,
    borderColor: '#FFF',
    zIndex: 100,
  },
  timeTagInactive: {
    backgroundColor: COLORS.surface,
    borderColor: '#555',
    zIndex: 50,
  },
  timeTextActive: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeTextInactive: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
