import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator, TouchableOpacity, Text, Alert, TextInput, FlatList, Keyboard, LayoutAnimation, UIManager, ScrollView } from 'react-native';
import Mapbox, { MapView, Camera, UserLocation, StyleURL, ShapeSource, LineLayer, PointAnnotation } from '@rnmapbox/maps';
import * as Location from 'expo-location';

import { LocateFixed, ArrowLeft, X, ArrowUpDown, Search, Menu, Clock, MoreVertical, Mic, Home, Briefcase, MapPin, Bookmark } from 'lucide-react-native';

import { useStore } from '../../store/useStore';
import { COLORS as FallbackColors, useThemeColors, SPACING } from '../../theme/theme';
import axios from 'axios';
import { MOCK_ROUTES } from './mockRouteData';
import { useLocationTelemetry } from '../../hooks/useLocationTelemetry';
import { DestinationSheet } from './DestinationSheet';
import { Sidebar } from '../UI/Sidebar';
import { SettingsModal } from '../UI/SettingsModal';
import { useHazardStore } from '../../store/useHazardStore';
import { apiClient } from '../../api/client';
import { decodeValhallaShape } from '../../utils/polyline';

const USE_MOCK = false;

// Mapbox Token Initialization
const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'MAPBOX_PUBLIC_TOKEN_PLACEHOLDER';
Mapbox.setAccessToken(mapboxToken);

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://20.40.61.11:8000';
const BACKEND_WS = process.env.EXPO_PUBLIC_BACKEND_WS || 'ws://20.40.61.11:8000/ws/sos';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const SafeMapView = () => {
  const COLORS = useThemeColors();
  const { 
    userLocation, destination, selectedPoi, origin, isRoutingMode, 
    searchQuery: globalSearchQuery, activeRoute, routes, routeBlocked,
    setUserLocation, setDestination, setSelectedPoi, setOrigin, setIsRoutingMode, 
    setSearchQuery: setGlobalSearchQuery, setActiveRoute, setRoutes, isLoading, setIsLoading,
    isNavigating, savedPlaces, sosAlerts, addSosAlert, removeSosAlert, setRouteBlocked, isAuthSheetVisible,
    user, setAuthSheetVisible
  } = useStore();

  const { hazards, fetchNearbyHazards } = useHazardStore();

  const handleCameraChanged = (e: any) => {
    // Mapbox provides exact bounds and center natively
    if (e?.properties?.bounds && e?.properties?.center) {
      const bounds = {
        ne: e.properties.bounds.ne,
        sw: e.properties.bounds.sw,
      };
      fetchNearbyHazards(bounds, e.properties.center);
    }
  };
  const cameraRef = useRef<Camera>(null);

  // UI State Machine
  const [uiState, setUiState] = useState<'HOME' | 'SEARCH' | 'POI' | 'ROUTING'>('HOME');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);

  // Search State
  const [query, setQuery] = useState('');
  const [originQuery, setOriginQuery] = useState('Your Location');
  const [activeInput, setActiveInput] = useState<'main' | 'origin' | 'destination'>('main');
  const [results, setResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useLocationTelemetry(isNavigating, 'commuter_dummy_123');

  // Trigger routing layout when store routing mode flips
  useEffect(() => {
    if (isRoutingMode && uiState !== 'ROUTING') {
      transitionTo('ROUTING');
    } else if (!isRoutingMode && !selectedPoi && uiState === 'ROUTING') {
      transitionTo('HOME');
      setQuery('');
      useStore.getState().setSearchQuery('');
      const center = userLocation || currentLocation;
      if (center) {
        cameraRef.current?.setCamera({ centerCoordinate: center, zoomLevel: 15, pitch: 0, animationDuration: 1000 });
      }
    }
  }, [isRoutingMode, selectedPoi, userLocation, currentLocation]);

  useEffect(() => {
    // Request location permission & Fetch Eagerly
    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission denied, using Hyderabad fallback');
          setCurrentLocation([78.4867, 17.3850]);
          setUserLocation([78.4867, 17.3850]);
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation([location.coords.longitude, location.coords.latitude]);
        setUserLocation([location.coords.longitude, location.coords.latitude]);
      } catch (error) {
        console.warn('GPS failed, using Hyderabad fallback', error);
        setCurrentLocation([78.4867, 17.3850]);
        setUserLocation([78.4867, 17.3850]);
      }
    };
    initializeLocation();

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWS = () => {
      ws = new WebSocket(BACKEND_WS);

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'SOS') {
            addSosAlert({ id: data.userId, location: [data.location.lng, data.location.lat] });
          } else if (data.type === 'SOS_RESOLVED' || data.event === 'sos_resolved') {
            removeSosAlert(data.userId);
          }
        } catch (err) {}
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connectWS, 5000);
      };

      ws.onerror = () => ws?.close();
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const routeDebounceRef = useRef<any>(null);

  useEffect(() => {
    if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);

    if (isRoutingMode && destination) {
      routeDebounceRef.current = setTimeout(() => {
        fetchRoutes();
      }, 400);
    } else if (!isRoutingMode) {
      setRoutes(null);
    }

    return () => {
      if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
    };
  }, [destination, isRoutingMode, origin, sosAlerts]);

  // Pan to POI when selected
  useEffect(() => {
    if (selectedPoi && !isRoutingMode) {
      cameraRef.current?.setCamera({
        centerCoordinate: selectedPoi,
        zoomLevel: 15,
        animationDuration: 800,
      });
    }
  }, [selectedPoi, isRoutingMode]);

  const fetchRoutes = async () => {
    if (!isRoutingMode || !destination) return;
    
    const startLoc = origin || userLocation || currentLocation;
    if (!startLoc) return;
    
    setIsLoading(true);
    
    if (USE_MOCK) {
      setTimeout(() => {
        setRoutes(MOCK_ROUTES);
        cameraRef.current?.fitBounds(startLoc, destination, [50, 50, 50, 50], 1000);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      const res = await apiClient.post('/route/safe', {
        origin: [startLoc[0], startLoc[1]], // [lon, lat]
        destination: [destination[0], destination[1]], // [lon, lat]
        mode: 'auto'
      });
      
      const trip = res.data?.route?.trip;
      if (!trip || !trip.legs || trip.legs.length === 0) {
        throw new Error("No route found");
      }

      // Valhalla polyline6 shape is located here
      const shapeString = trip.legs[0].shape;
      const decodedShape = decodeValhallaShape(shapeString, trip.summary);

      if (decodedShape) {
        setRoutes({ safest: decodedShape }); // We only have one dynamic route for now
        setRouteBlocked(false);
        cameraRef.current?.fitBounds(startLoc, destination, [50, 50, 50, 50], 1000);
      }
    } catch (error: any) {
      console.warn("Routing error", error);
      if (error.response && error.response.status === 400) {
        Alert.alert('Routing Error', 'No suitable roads found near this location.');
      } else {
        Alert.alert('Routing Error', 'Failed to calculate route.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onUserLocationUpdate = (location: any) => {
    const { longitude, latitude } = location.coords;
    setUserLocation([longitude, latitude]);
  };

  const transitionTo = (nextState: 'HOME' | 'SEARCH' | 'POI' | 'ROUTING') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (nextState === 'HOME') {
      const store = useStore.getState();
      store.setSelectedPoi(null);
      store.setDestination(null);
      store.setRoutes(null);
      store.setIsRoutingMode(false);
      store.setSearchQuery('');
      setQuery('');
      setOriginQuery('');
    }
    setUiState(nextState);
  };

  const searchPlaces = async (text: string) => {
    if (activeInput === 'origin') setOriginQuery(text);
    else {
      setQuery(text);
      useStore.getState().setSearchQuery(text);
    }

    if (text.length > 2) {
      setSearchError(null);
      try {
        let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=8`;
        if (currentLocation) {
          url += `&lat=${currentLocation[1]}&lon=${currentLocation[0]}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        const mappedFeatures = data.features.map((f: any) => ({
          mapbox_id: Math.random().toString(),
          text: f.properties.name || f.properties.street || f.properties.city,
          place_name: [f.properties.name, f.properties.street, f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', '),
          center: f.geometry.coordinates // [lon, lat]
        }));
        setResults(mappedFeatures || []);
      } catch (e) {
        setSearchError('Network Error. Please try again.');
        setResults([]);
      }
    } else {
      setSearchError(null);
      setResults([]);
    }
  };

  const handleSelect = async (item: any) => {
    Keyboard.dismiss();
    try {
      const coords = item.center;
      const placeName = item.text || item.place_name || "Selected Location";

      if (activeInput === 'origin') {
        useStore.getState().setOrigin(coords as [number, number]);
        setOriginQuery(placeName);
        setResults([]);
      } else {
        if (useStore.getState().isRoutingMode) {
          useStore.getState().setDestination(coords as [number, number]);
          useStore.getState().setSearchQuery(placeName);
          useStore.getState().setSelectedPoi(null);
          setQuery(placeName);
          setResults([]);
          transitionTo('ROUTING');
        } else {
          useStore.getState().setSelectedPoi(coords as [number, number]);
          useStore.getState().setDestination(coords as [number, number]);
          useStore.getState().setSearchQuery(placeName);
          setQuery(placeName);
          setResults([]);
          transitionTo('POI');
        }
        useStore.getState().addRecentSearch({
          id: item.id || item.mapbox_id || Math.random().toString(),
          place_name: item.place_name || item.text || placeName,
          center: coords as [number, number]
        });
      }
    } catch (e) {
      console.warn('Select error', e);
    }
  };

  const reverseRoute = () => {
    const { origin, destination, setOrigin, setDestination } = useStore.getState();
    const tempOrigin = origin || currentLocation;
    if (!tempOrigin || !destination) return;

    // Destructure & Swap
    setOrigin(destination);
    setDestination(tempOrigin);
    
    const tempOriginQuery = originQuery;
    setOriginQuery(query);
    setQuery(tempOriginQuery);

    // [BACKEND RE-TRIGGER COMMENT]
    // Changing the 'origin' and 'destination' states triggers the useEffect watching those variables above,
    // which automatically fires fetchRoutes() to get the new Valhalla paths.
  };

  // UI Sub-renders
  const renderHomeHeader = () => (
    <View style={styles.homeHeader}>
      <View style={styles.searchPill}>
        <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.iconMargin}>
          <Menu color={COLORS.textSecondary} size={24} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{flex: 1, height: '100%', justifyContent: 'center'}}
          onPress={() => {
            setQuery('');
            setResults([]);
            transitionTo('SEARCH');
          }}
        >
          <Text style={styles.searchPillText}>Search here</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchHeader = () => (
    <View style={styles.searchOverlay}>
      <View style={styles.searchHeaderRow}>
        <TouchableOpacity onPress={() => transitionTo('HOME')} style={styles.iconMargin}>
          <ArrowLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          autoFocus
          placeholder="Search"
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={(text) => {
            setActiveInput('main');
            searchPlaces(text);
          }}
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }} style={styles.iconMargin}>
             <X color={COLORS.textSecondary} size={22} />
          </TouchableOpacity>
        ) : (
          <Mic color={COLORS.textSecondary} size={22} style={styles.iconMargin} />
        )}
      </View>
      
      {query.length === 0 ? (
        <ScrollView style={{ paddingHorizontal: SPACING.md, marginTop: SPACING.sm }} showsVerticalScrollIndicator={false}>
          {useStore.getState().recentSearches.length > 0 && (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md, marginBottom: SPACING.sm, paddingHorizontal: SPACING.xs }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' }}>RECENT SEARCHES</Text>
                <TouchableOpacity onPress={() => useStore.getState().clearRecentSearches()}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }}>Clear</Text>
                </TouchableOpacity>
              </View>
              {useStore.getState().recentSearches.slice(0, 4).map(search => (
                <TouchableOpacity 
                  key={search.id} 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.glass }}
                  onPress={() => handleSelect(search)}
                >
                  <Clock color={COLORS.textSecondary} size={20} />
                  <Text style={{ color: COLORS.text, fontSize: 16, marginLeft: SPACING.md }} numberOfLines={1}>{search.place_name}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {savedPlaces.length > 0 && (
            <>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginTop: SPACING.lg, marginBottom: SPACING.sm, marginLeft: SPACING.xs }}>SAVED PLACES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm, paddingBottom: SPACING.lg }}>
                {savedPlaces.slice(0, 3).map(place => (
                  <TouchableOpacity 
                    key={place.id} 
                    style={{ 
                      backgroundColor: COLORS.glass, 
                      padding: SPACING.md, 
                      borderRadius: 16, 
                      width: 140,
                      borderWidth: 1,
                      borderColor: COLORS.glass
                    }}
                    onPress={() => handleSelect(place)}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.glass, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm }}>
                      {place.label === 'Home' ? <Home color={COLORS.text} size={18} /> : place.label === 'Work' ? <Briefcase color={COLORS.text} size={18} /> : <MapPin color={COLORS.text} size={18} />}
                    </View>
                    <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }} numberOfLines={1}>{place.label || place.customLabel}</Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12 }} numberOfLines={1}>{place.place_name.split(',')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </ScrollView>
      ) : searchError ? (
        <View style={styles.noResultsContainer}>
          <Text style={[styles.noResultsText, { color: COLORS.text }]}>{searchError}</Text>
        </View>
      ) : query.length > 2 && results.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Text style={[styles.noResultsText, { color: COLORS.text }]}>No results found.</Text>
          <Text style={[styles.noResultsSubText, { color: COLORS.textSecondary }]}>Try checking your spelling or searching for a different landmark.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => item.mapbox_id || index.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: SPACING.md }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
              <Search color={COLORS.textSecondary} size={20} style={{marginRight: SPACING.sm}} />
              <Text style={styles.resultText} numberOfLines={1}>
                 {item.place_name || item.text}
              </Text>
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation();
                  if (!user) {
                    setAuthSheetVisible(true);
                    return;
                  }
                  // TODO: Save logic
                }} 
                style={{ marginLeft: 'auto', padding: SPACING.xs }}
              >
                 <Bookmark color={COLORS.textSecondary} size={20} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderPoiHeader = () => (
    <View style={styles.poiHeader}>
      <TouchableOpacity onPress={() => transitionTo('HOME')} style={styles.iconMargin}>
        <ArrowLeft color={COLORS.text} size={24} />
      </TouchableOpacity>
      <Text style={styles.poiHeaderText} numberOfLines={1}>{query}</Text>
      <View style={{flex: 1}} />
      <TouchableOpacity onPress={() => { setQuery(''); transitionTo('SEARCH'); }}>
        <X color={COLORS.text} size={24} />
      </TouchableOpacity>
    </View>
  );

  const renderRoutingHeader = () => (
    <View style={styles.routingHeader}>
       <View style={styles.routingHeaderTopRow}>
         <TouchableOpacity onPress={() => {
            useStore.getState().setIsRoutingMode(false);
            useStore.getState().setRoutes(null);
            useStore.getState().setSelectedPoi(useStore.getState().destination);
            transitionTo('POI');
         }} style={styles.iconMargin}>
           <ArrowLeft color={COLORS.text} size={24} />
         </TouchableOpacity>
         <View style={{ flex: 1 }} />
         <MoreVertical color={COLORS.text} size={24} />
       </View>

       <View style={styles.routingInputsRow}>
         <View style={styles.routingDots}>
            <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
            <View style={styles.dotLine} />
            <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
         </View>
         <View style={styles.routingFields}>
            <TextInput
              style={styles.routingInput}
              value={originQuery}
              onChangeText={(text) => {
                 setActiveInput('origin');
                 searchPlaces(text);
              }}
              placeholder="Your Location"
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={styles.routingDivider} />
            <TextInput
              style={styles.routingInput}
              value={query}
              onChangeText={(text) => {
                 setActiveInput('destination');
                 searchPlaces(text);
              }}
              placeholder="Destination"
              placeholderTextColor={COLORS.textSecondary}
            />
         </View>
         <TouchableOpacity onPress={reverseRoute} style={styles.reverseBtn}>
            <ArrowUpDown color={COLORS.textSecondary} size={24} />
         </TouchableOpacity>
       </View>

       {results.length > 0 && (
          <View style={styles.routingResults}>
             <FlatList
              data={results}
              keyExtractor={(item, index) => item.mapbox_id || index.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                  <Search color={COLORS.textSecondary} size={20} style={{marginRight: SPACING.sm}} />
                  <Text style={styles.resultText} numberOfLines={1}>
                     {item.place_name || item.text}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
       )}
    </View>
  );

  const getMidpoint = (routeData: any) => {
    if (!routeData?.geometry?.coordinates?.length) return null;
    const coords = routeData.geometry.coordinates;
    return coords[Math.floor(coords.length / 2)];
  };

  const getETA = (routeData: any) => {
    if (!routeData?.properties?.time) return '';
    return `${Math.round(routeData.properties.time / 60)} min`;
  };

  const fastestMid = getMidpoint(routes?.fastest);
  const safestMid = getMidpoint(routes?.safest);
  const isSameRoute = fastestMid && safestMid && fastestMid[0] === safestMid[0] && fastestMid[1] === safestMid[1];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        styleURL={StyleURL.Street}
        logoEnabled={false}
        attributionEnabled={false}
        scaleBarEnabled={false}
        onCameraChanged={handleCameraChanged}
      >
        <Camera
          ref={cameraRef}
          zoomLevel={isNavigating ? 18 : 15}
          pitch={isNavigating ? 60 : 0}
          centerCoordinate={currentLocation || [-74.0060, 40.7128]}
          animationMode="flyTo"
          animationDuration={1000}
          followUserLocation={isNavigating ? true : undefined}
          followUserMode={isNavigating ? "course" as any : undefined}
        />

        {/* Hazard Markers */}
        {hazards.map((hazard) => {
          let pinColor = '#6B7280'; // Default gray
          if (hazard.hazard_type === 'CRIME') pinColor = '#EF4444';
          else if (hazard.hazard_type === 'UNLIT') pinColor = '#F59E0B';
          else if (hazard.hazard_type === 'ROADBLOCK') pinColor = '#3B82F6';

          return (
            <PointAnnotation
              key={`hazard-${hazard.id}`}
              id={`hazard-${hazard.id}`}
              coordinate={hazard.coordinates} // Mapbox natively uses [lon, lat]!
            >
              <View style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: pinColor,
                borderWidth: 2,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 3,
                elevation: 5
              }} />
            </PointAnnotation>
          );
        })}

        {routes?.fastest && (
          <ShapeSource id="fastestSource" shape={routes.fastest} tolerance={10}>
            <LineLayer id="fastestLayer" style={{ lineColor: '#007AFF', lineWidth: activeRoute === 'fastest' ? 8 : 5, lineOpacity: activeRoute === 'fastest' ? 1 : 0.4, lineCap: 'round', lineJoin: 'round' }} />
          </ShapeSource>
        )}

        {routes?.safest && (
          <ShapeSource id="safestSource" shape={routes.safest} tolerance={10}>
            <LineLayer id="safestLayer" style={{ lineColor: '#5AC8FA', lineWidth: activeRoute === 'safest' ? 8 : 5, lineOpacity: activeRoute === 'safest' ? 1 : 0.4, lineCap: 'round', lineJoin: 'round', lineBlur: activeRoute === 'safest' ? 2 : 0 }} />
          </ShapeSource>
        )}

        {!isNavigating && fastestMid && (
          <PointAnnotation key="fastest-tag" id="fastest-tag" coordinate={fastestMid}>
            <TouchableOpacity style={[styles.timeTag, activeRoute === 'fastest' ? styles.timeTagActiveFastest : styles.timeTagInactive]} onPress={() => useStore.getState().setActiveRoute('fastest')}>
              <Text style={activeRoute === 'fastest' ? styles.timeTextActive : styles.timeTextInactive}>
                {isSameRoute ? `${getETA(routes?.fastest)} (Best)` : getETA(routes?.fastest)}
              </Text>
            </TouchableOpacity>
          </PointAnnotation>
        )}

        {!isNavigating && safestMid && !isSameRoute && (
          <PointAnnotation key="safest-tag" id="safest-tag" coordinate={safestMid}>
            <TouchableOpacity style={[styles.timeTag, activeRoute === 'safest' ? styles.timeTagActiveSafest : styles.timeTagInactive]} onPress={() => useStore.getState().setActiveRoute('safest')}>
              <Text style={activeRoute === 'safest' ? styles.timeTextActive : styles.timeTextInactive}>{getETA(routes?.safest)}</Text>
            </TouchableOpacity>
          </PointAnnotation>
        )}

        {sosAlerts.map((alert: any) => (
          <PointAnnotation key={alert.id} id={alert.id} coordinate={alert.location}>
            <View style={styles.pulseContainer}><View style={styles.pulseInner} /></View>
          </PointAnnotation>
        ))}

        {(selectedPoi || destination) && (
          <PointAnnotation id="destination-pin" coordinate={selectedPoi || destination || [0,0]} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.destinationPinContainer}><View style={styles.destinationPinInner} /></View>
          </PointAnnotation>
        )}

        <UserLocation visible={true} onUpdate={onUserLocationUpdate} showsUserHeadingIndicator={true} minDisplacement={3} androidRenderMode="normal" />
      </MapView>
      
      {/* Dynamic UI Overlay */}
      <View style={[styles.uiWrapper, uiState === 'SEARCH' && styles.uiWrapperFullscreen]} pointerEvents={uiState === 'SEARCH' ? 'auto' : 'box-none'}>
         {uiState === 'HOME' && !isNavigating && renderHomeHeader()}
         {uiState === 'SEARCH' && !isNavigating && renderSearchHeader()}
         {uiState === 'POI' && !isNavigating && renderPoiHeader()}
         {uiState === 'ROUTING' && !isNavigating && renderRoutingHeader()}
      </View>

      {userLocation && uiState !== 'SEARCH' && !isAuthSheetVisible && (
        <TouchableOpacity 
          style={[styles.recenterButton, isNavigating ? { bottom: 120 } : { bottom: destination ? 340 : 100 }]}
          onPress={() => {
            cameraRef.current?.setCamera({ centerCoordinate: userLocation, zoomLevel: isNavigating ? 18 : 16, pitch: isNavigating ? 60 : 0, animationDuration: 1000 });
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

      <DestinationSheet />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <SettingsModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: FallbackColors.background },
  map: { flex: 1 },
  uiWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  uiWrapperFullscreen: {
    top: 0,
    bottom: 0,
    backgroundColor: FallbackColors.background,
  },
  homeHeader: {
    paddingHorizontal: SPACING.md,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FallbackColors.surface,
    borderRadius: 28,
    paddingHorizontal: SPACING.sm,
    height: 52,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  searchPillText: {
    color: FallbackColors.textSecondary,
    fontSize: 16,
    marginLeft: SPACING.xs,
  },
  searchOverlay: {
    flex: 1,
    backgroundColor: FallbackColors.background,
  },
  searchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    color: FallbackColors.text,
    fontSize: 16,
    marginLeft: SPACING.xs,
  },
  iconMargin: {
    marginRight: SPACING.sm,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: FallbackColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  resultText: {
    color: FallbackColors.text,
    fontSize: 15,
    flex: 1,
  },
  noResultsContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  noResultsText: {
    color: FallbackColors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  noResultsSubText: {
    color: FallbackColors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  poiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FallbackColors.surface,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 52,
    borderRadius: 12,
    elevation: 8,
  },
  poiHeaderText: {
    color: FallbackColors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
    maxWidth: '70%',
  },
  routingHeader: {
    backgroundColor: FallbackColors.surface,
    marginHorizontal: SPACING.md,
    borderRadius: 16,
    padding: SPACING.md,
    elevation: 10,
  },
  routingHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  routingInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routingDots: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotLine: { width: 2, height: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  routingFields: {
    flex: 1,
  },
  routingInput: {
    color: '#FFF',
    fontSize: 15,
    paddingVertical: 8,
    fontWeight: 'bold',
  },
  routingDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  reverseBtn: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  routingResults: {
    maxHeight: 250,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  pulseContainer: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255, 59, 48, 0.3)', justifyContent: 'center', alignItems: 'center' },
  pulseInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: FallbackColors.danger, borderWidth: 2, borderColor: '#FFF' },
  destinationPinContainer: { width: 34, height: 34, backgroundColor: '#EA4335', borderTopLeftRadius: 17, borderTopRightRadius: 17, borderBottomLeftRadius: 17, borderBottomRightRadius: 2, transform: [{ rotate: '-45deg' }], justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 6, marginBottom: 4 },
  destinationPinInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#7A0E00' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  recenterButton: { position: 'absolute', right: SPACING.md, backgroundColor: FallbackColors.surface, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, zIndex: 50 },
  timeTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  timeTagActiveFastest: { backgroundColor: FallbackColors.secondary, borderColor: '#FFF', zIndex: 100 },
  timeTagActiveSafest: { backgroundColor: FallbackColors.primary, borderColor: '#FFF', zIndex: 100 },
  timeTagInactive: { backgroundColor: FallbackColors.surface, borderColor: '#555', zIndex: 50 },
  timeTextActive: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  timeTextInactive: { color: FallbackColors.textSecondary, fontSize: 14, fontWeight: 'bold' },
});
