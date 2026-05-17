import React, { useState } from 'react';
import { StyleSheet, View, TextInput, FlatList, TouchableOpacity, Text } from 'react-native';
import { Search } from 'lucide-react-native';
import { COLORS, SPACING } from '../../theme/theme';
import { useStore } from '../../store/useStore';

const MAPBOX_TOKEN = 'MAPBOX_PUBLIC_TOKEN_PLACEHOLDER';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const setDestination = useStore((state) => state.setDestination);

  const searchPlaces = async (text: string) => {
    setQuery(text);
    if (text.length < 3) {
      setResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&limit=5`
      );
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <Search color={COLORS.textSecondary} size={20} />
        <TextInput
          style={styles.input}
          placeholder="Where to?"
          placeholderTextColor={COLORS.textSecondary}
          value={query}
          onChangeText={searchPlaces}
        />
      </View>
      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)}>
                <Text style={styles.resultText}>{item.place_name}</Text>
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
    top: 60,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    marginLeft: SPACING.sm,
  },
  resultsContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: SPACING.xs,
    maxHeight: 250,
    overflow: 'hidden',
  },
  resultItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  resultText: {
    color: COLORS.text,
    fontSize: 14,
  },
});
