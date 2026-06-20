import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeMapView } from './src/components/Map/SafeMapView';
import { RouteDetails } from './src/components/UI/RouteDetails';
import { SOSButton } from './src/components/UI/SOSButton';
import { SplashScreen } from './src/components/UI/SplashScreen';
import { useThemeColors } from './src/theme/theme';
import { useStore } from './src/store/useStore';

export default function App() {
  const isNavigating = useStore((state) => state.isNavigating);
  const [isAppReady, setIsAppReady] = useState(false);

  const colors = useThemeColors();
  const isLight = colors.background === '#F2F2F7';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style={isLight ? "dark" : "light"} />
        <SafeMapView />
        <SOSButton />
      </View>
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 999, elevation: 999 }]} pointerEvents="box-none">
        <RouteDetails />
      </View>
      {!isAppReady && (
        <SplashScreen onFinish={() => setIsAppReady(true)} />
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background color is handled dynamically in the component
    paddingTop: Platform.OS === 'android' ? 40 : 50,
  },
});
