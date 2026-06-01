import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export const useLocationTelemetry = (isNavigating: boolean, userId: string) => {
  const wsRef = useRef<WebSocket | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (!isNavigating) {
      // Clean up previous telemetry subscriptions and connections when not navigating
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
        console.log('Location telemetry subscription removed.');
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        console.log('Telemetry WebSocket closed.');
      }
      return;
    }

    const wsUrl = process.env.EXPO_PUBLIC_BACKEND_WS || 'ws://20.40.61.11:8000/ws/sos';
    console.log('Connecting telemetry WS to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Telemetry WebSocket connected.');
    };

    ws.onerror = (err) => {
      console.error('Telemetry WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('Telemetry WebSocket closed.');
    };

    let active = true;

    const startTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Foreground location permission denied for telemetry');
          return;
        }

        if (!active) return;

        // Throttled tracking: timeInterval = 4000ms, distanceInterval = 5 meters
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 4000,
            distanceInterval: 5,
          },
          (location) => {
            if (ws.readyState === WebSocket.OPEN) {
              const payload = {
                user_id: userId,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                speed: location.coords.speed,
                heading: location.coords.heading,
                timestamp: new Date(location.timestamp).toISOString(),
              };
              ws.send(JSON.stringify(payload));
              console.log('Sent location telemetry payload:', payload);
            }
          }
        );

        subscriptionRef.current = subscription;
        console.log('Location telemetry tracking started.');
      } catch (err) {
        console.error('Failed to start location telemetry:', err);
      }
    };

    startTracking();

    return () => {
      active = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
        console.log('Cleaned up location telemetry subscription.');
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        console.log('Cleaned up telemetry WebSocket.');
      }
    };
  }, [isNavigating, userId]);
};
