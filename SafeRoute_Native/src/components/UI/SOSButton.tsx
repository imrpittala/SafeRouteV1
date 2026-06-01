import React from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { COLORS } from '../../theme/theme';
import { useStore } from '../../store/useStore';

const BACKEND_WS = process.env.EXPO_PUBLIC_BACKEND_WS || 'ws://20.40.61.11:8000/ws/sos';

export const SOSButton = () => {
  const { userLocation, destination, isNavigating } = useStore();
  const [isSending, setIsSending] = React.useState(false);

  const handleSOS = () => {
    if (isSending) return;
    if (!userLocation) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    Alert.alert(
      'Broadcast SOS?',
      'This will alert nearby users of your emergency.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'BROADCAST', 
          onPress: sendSOS,
          style: 'destructive'
        },
      ]
    );
  };

  const sendSOS = () => {
    setIsSending(true);
    try {
      const ws = new WebSocket(BACKEND_WS);
      ws.onopen = () => {
        ws.send(JSON.stringify({
          userId: 'user-' + Math.floor(Math.random() * 1000),
          location: { lat: userLocation![1], lng: userLocation![0] }, // Convert [lng, lat] to { lat, lng }
          timestamp: new Date().toISOString(),
          type: 'SOS',
        }));
        setTimeout(() => {
          ws.close();
          setIsSending(false);
        }, 1000);
        Alert.alert('Success', 'Emergency broadcast sent.');
      };
      ws.onerror = (e) => {
        console.error('WS Error:', e);
        Alert.alert('Error', 'Could not connect to safety network.');
        setIsSending(false);
      };
    } catch (error) {
      console.error('SOS Error:', error);
      setIsSending(false);
    }
  };

  // Dynamic positioning to sit right above the Recenter button
  const bottomPosition = (isNavigating ? 120 : destination ? 340 : 100) + 68;

  return (
    <TouchableOpacity 
      style={[styles.button, { bottom: bottomPosition }]} 
      onPress={handleSOS}
    >
      <AlertCircle color="#FFF" size={24} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 20,
    backgroundColor: COLORS.danger,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100,
  },
});
