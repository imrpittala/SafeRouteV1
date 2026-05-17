import { useEffect, useRef } from 'react';
import { useStore, type SOSAlert } from '../store/useStore';

export const useWebSocket = () => {
  const { addAlert, setSystemStatus } = useStore();
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:8000/ws/admin';
    
    const connect = () => {
      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket Connected');
        setSystemStatus('healthy');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Backend sends { type: 'SOS', ...payload }
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
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket Disconnected. Retrying in 5s...');
        setSystemStatus('warning');
        setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket Error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [addAlert, setSystemStatus]);

  // For testing: Function to simulate an alert
  const simulateAlert = () => {
    const mockAlert: SOSAlert = {
      userId: `user_${Math.floor(Math.random() * 1000)}`,
      location: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
        lng: -74.0060 + (Math.random() - 0.5) * 0.1,
      },
      timestamp: new Date().toISOString(),
      type: 'SOS',
      status: 'active'
    };
    addAlert(mockAlert);
  };

  return { simulateAlert };
};
