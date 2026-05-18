import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeMapView } from './src/components/Map/SafeMapView';
import { SearchBar } from './src/components/UI/SearchBar';
import { RouteDetails } from './src/components/UI/RouteDetails';
import { SOSButton } from './src/components/UI/SOSButton';
import { COLORS } from './src/theme/theme';
import { useStore } from './src/store/useStore';

export default function App() {
  const isNavigating = useStore((state) => state.isNavigating);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeMapView />
        {!isNavigating && <SearchBar />}
        <SOSButton />
      </View>
      <View style={[StyleSheet.absoluteFillObject, { zIndex: 999, elevation: 999 }]} pointerEvents="box-none">
        <RouteDetails />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
  },
});
