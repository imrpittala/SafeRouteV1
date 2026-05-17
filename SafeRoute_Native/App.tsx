import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeMapView } from './src/components/Map/SafeMapView';
import { SearchBar } from './src/components/UI/SearchBar';
import { RouteDetails } from './src/components/UI/RouteDetails';
import { SOSButton } from './src/components/UI/SOSButton';
import { COLORS } from './src/theme/theme';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <SafeMapView />
        <SearchBar />
        <SOSButton />
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
