import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

export const useSosAlerts = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      // Use the public VM IP fallback to prevent Android emulator resolution issues with localhost
      const wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://20.40.61.11:8000/ws/sos';
      console.log(`[SOS-WS] Attempting to connect to: ${wsUrl}`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) {
          ws.close();
          return;
        }
        console.log('[SOS-WS] Connection established successfully.');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log('[SOS-WS] Received message payload:', payload);

          // Support both event types and handle flat/nested shapes defensively
          if (payload.event === 'sos_alert' || payload.type === 'SOS') {
            const data = payload.data || payload;
            const userId = data.user_id || data.userId || 'Unknown User';
            const lat = data.latitude || (data.location && data.location.lat);
            const lng = data.longitude || (data.location && data.location.lng);

            console.warn(`[SOS-WS] HIGH PRIORITY: SOS Alert received from ${userId} at [${lat}, ${lng}]`);

            Alert.alert(
              '⚠️ EMERGENCY SOS ALERT',
              `User ID: ${userId.slice(0, 8)}\nLatitude: ${lat}\nLongitude: ${lng}\n\nEmergency services notified!`,
              [{ text: 'Dismiss', style: 'cancel' }],
              { cancelable: true }
            );
          }
        } catch (err) {
          console.error('[SOS-WS] Error parsing incoming payload:', err);
        }
      };

      ws.onerror = (errorEvent) => {
        // Log WebSocket error event details
        console.error('[SOS-WS] WebSocket error encountered:', errorEvent);
        ws.close();
      };

      ws.onclose = (closeEvent) => {
        // Dereference listeners to avoid memory retention/leaks
        if (wsRef.current === ws) {
          ws.onmessage = null;
          ws.onclose = null;
          ws.onerror = null;
          wsRef.current = null;
        }

        console.log(
          `[SOS-WS] Connection closed. Code: ${closeEvent.code}, Reason: "${closeEvent.reason || 'None'}", Clean: ${closeEvent.wasClean}`
        );

        if (isMounted) {
          console.log('[SOS-WS] Reconnecting in 5 seconds...');
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      console.log('[SOS-WS] Unmounting useSosAlerts hook. Cleaning up WebSocket...');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        wsRef.current = null;
      }
    };
  }, []);
};
