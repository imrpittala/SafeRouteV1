import { useEffect } from 'react';
import { useStore, type SOSAlert } from '../store/useStore';

// Reference-counted shared socket variables at module scope
let globalSocket: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
const listeners = new Set<(data: any) => void>();

export const useWebSocket = () => {
  const { addAlert, setSystemStatus } = useStore();

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:8000/ws/sos';

    const handleMessage = (data: any) => {
      if (data.type === 'SOS') {
        const alert: SOSAlert = {
          userId: data.userId,
          location: data.location,
          timestamp: data.timestamp || new Date().toISOString(),
          type: 'SOS',
          status: 'active'
        };
        addAlert(alert);
      }
    };

    // Add this component instance's handler to the shared listeners pool
    listeners.add(handleMessage);

    const connect = () => {
      if (globalSocket) return;

      console.log('Connecting shared WebSocket client to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      globalSocket = ws;

      ws.onopen = () => {
        console.log('Shared WebSocket Connected successfully.');
        setSystemStatus('healthy');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Broadcast incoming message to all mounted listeners
          listeners.forEach((listener) => listener(data));
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('Shared WebSocket Disconnected. Retrying in 5s...');
        setSystemStatus('warning');
        globalSocket = null;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error('Shared WebSocket Error:', err);
        ws.close();
      };
    };

    // Only start socket if no shared connection exists
    if (!globalSocket) {
      connect();
    } else if (globalSocket.readyState === WebSocket.OPEN) {
      setSystemStatus('healthy');
    }

    return () => {
      // Remove handler on component unmount
      listeners.delete(handleMessage);

      // Clean up connection if zero components are listening
      if (listeners.size === 0) {
        if (globalSocket) {
          console.log('Closing shared WebSocket connection (0 active listeners)');
          globalSocket.close();
          globalSocket = null;
        }
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      }
    };
  }, [addAlert, setSystemStatus]);

  // For testing: Function to simulate an alert
  const simulateAlert = () => {
    const mockAlert: SOSAlert = {
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      location: {
        lat: 17.4849 + (Math.random() - 0.5) * 0.03, // Center around Kukatpally, Hyderabad
        lng: 78.4026 + (Math.random() - 0.5) * 0.03,
      },
      timestamp: new Date().toISOString(),
      type: 'SOS',
      status: 'active'
    };
    addAlert(mockAlert);
  };

  return { simulateAlert };
};
