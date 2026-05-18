import React, { useState } from 'react';
import { StyleSheet, View, TextInput, FlatList, TouchableOpacity, Text, Platform, Keyboard } from 'react-native';
import { Menu, Mic, X, Clock, ArrowLeft, MoreVertical, Route } from 'lucide-react-native';
import { COLORS, SPACING } from '../../theme/theme';
import { useStore } from '../../store/useStore';

const MAPBOX_TOKEN = 'MAPBOX_PUBLIC_TOKEN_PLACEHOLDER';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const { destination, setDestination, userLocation, recentSearches, addRecentSearch, setRoutes } = useStore();

  const searchPlaces = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }

    try {
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&country=in&limit=5`;
      
      // Prioritize results near the user if location is available
      if (userLocation) {
        url += `&proximity=${userLocation[0]},${userLocation[1]}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      setResults(data.features || []);
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const handleSelect = (item: any) => {
    const [lon, lat] = item.center;
    setDestination([lon, lat]);
    setQuery(item.place_name);
    setResults([]);
    Keyboard.dismiss();
    setIsFocused(false);
    
    addRecentSearch({
      id: item.id,
      place_name: item.place_name,
      center: item.center
    });
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  // If a destination is selected, show the Route Planning Header instead of Search
  if (destination) {
    return (
      <View style={styles.plannerContainer}>
        <View style={styles.plannerHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setDestination(null);
              setRoutes(null);
            }}
          >
            <ArrowLeft color={COLORS.textSecondary} size={24} />
          </TouchableOpacity>
          
          <View style={styles.plannerInputs}>
            <View style={styles.plannerRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.plannerText}>Your Location</Text>
            </View>
            <View style={styles.plannerDivider} />
            <View style={styles.plannerRow}>
              <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.plannerTextBold} numberOfLines={1}>{query || 'Destination'}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.iconButton}>
            <MoreVertical color={COLORS.textSecondary} size={24} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TouchableOpacity style={styles.iconButton}>
          <Menu color={COLORS.textSecondary} size={24} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Search here"
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={searchPlaces}
          onFocus={() => setIsFocused(true)}
        />
        
        {query.length > 0 ? (
          <TouchableOpacity style={styles.iconButton} onPress={clearSearch}>
            <X color={COLORS.textSecondary} size={22} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconButton}>
            <Mic color={COLORS.textSecondary} size={22} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.profileButton}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileText}>U</Text>
          </View>
        </TouchableOpacity>
      </View>
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <Text style={styles.resultText} numberOfLines={1}>{item.place_name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Recent Searches (When Empty & Focused) */}
      {isFocused && query.length === 0 && recentSearches && recentSearches.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.recentHeader}>Recent Searches</Text>
          <FlatList
            data={recentSearches}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.recentItem} onPress={() => handleSelect(item)}>
                <Clock color={COLORS.textSecondary} size={18} style={{ marginRight: 12 }} />
                <Text style={styles.resultText} numberOfLines={1}>{item.place_name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 28, // More pill-shaped
    paddingHorizontal: SPACING.sm,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  iconButton: {
    padding: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    paddingHorizontal: SPACING.xs,
  },
  profileButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: SPACING.xs,
    maxHeight: 250,
    overflow: 'hidden',
  },
  // Route Planner Styles
  plannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  plannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  plannerInputs: {
    flex: 1,
  },
  plannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },
  plannerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 16,
  },
  plannerText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  plannerTextBold: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  resultItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  recentItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentHeader: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    padding: SPACING.md,
    paddingBottom: 0,
  },
  resultText: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },
});
