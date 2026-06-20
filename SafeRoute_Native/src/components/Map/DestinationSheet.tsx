import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Navigation2, Share, Bookmark } from 'lucide-react-native';
import { usePlaceDetails } from '../../hooks/usePlaceDetails';
import { COLORS as FallbackColors, useThemeColors, SPACING } from '../../theme/theme';
import { useStore } from '../../store/useStore';

export const DestinationSheet = () => {
  const COLORS = useThemeColors();
  const { selectedPoi, setSelectedPoi, setDestination, setIsRoutingMode, user, setAuthSheetVisible } = useStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);
  const { isLoading, error, data } = usePlaceDetails(selectedPoi);

  const handleSavePlace = () => {
    if (!user) {
      setAuthSheetVisible(true);
      return;
    }
    // TODO: implement saving logic here
  };

  useEffect(() => {
    if (selectedPoi) {
      bottomSheetRef.current?.snapToIndex(0); // Snap to 25%
    } else {
      bottomSheetRef.current?.close();
    }
  }, [selectedPoi]);

  const handleDirections = () => {
    if (selectedPoi) {
      setDestination(selectedPoi);
      setIsRoutingMode(true);
      setSelectedPoi(null);
    }
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Closed by default
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      backgroundStyle={[styles.bottomSheetBackground, { backgroundColor: COLORS.surface }]}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading place details...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data ? (
          <>
            {/* Header section */}
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={2}>
                {data.placeName || 'Unknown Location'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleDirections}>
                <View style={styles.iconCircle}>
                  <Navigation2 size={24} color="#FFF" />
                </View>
                <Text style={styles.actionText}>Directions</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton}>
                <View style={styles.iconCircle}>
                  <Share size={24} color="#FFF" />
                </View>
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={handleSavePlace}>
                <View style={styles.iconCircle}>
                  <Bookmark size={24} color="#FFF" />
                </View>
                <Text style={styles.actionText}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Placeholder Image Block */}
            <View style={styles.imageBlock}>
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>Location Image</Text>
              </View>
            </View>

            {/* Quick Facts Section */}
            <View style={styles.quickFacts}>
              <Text style={styles.sectionTitle}>Quick Facts</Text>
              <Text style={styles.description}>
                {data.description || 'No description available for this place.'}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholderText}>Select a destination to view details.</Text>
          </View>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    // Background color is handled inline via backgroundStyle
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  handleIndicator: {
    backgroundColor: FallbackColors.textSecondary,
    width: 40,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: FallbackColors.textSecondary,
    fontSize: 16,
  },
  errorText: {
    color: FallbackColors.danger,
    fontSize: 16,
    textAlign: 'center',
  },
  placeholderText: {
    color: FallbackColors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: FallbackColors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: SPACING.lg,
    gap: SPACING.xl,
  },
  actionButton: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: FallbackColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionText: {
    color: FallbackColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  imageBlock: {
    marginBottom: SPACING.lg,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#333',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#888',
    fontWeight: 'bold',
  },
  quickFacts: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: FallbackColors.text,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: 14,
    color: FallbackColors.textSecondary,
    lineHeight: 20,
  },
});
