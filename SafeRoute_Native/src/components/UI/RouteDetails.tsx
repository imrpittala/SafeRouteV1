import React, { useMemo, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { COLORS, SPACING } from '../../theme/theme';
import { useStore } from '../../store/useStore';
import { Zap, ShieldCheck } from 'lucide-react-native';

export const RouteDetails = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['15%', '40%'], []);

  const { activeRoute, setActiveRoute, routes, destination } = useStore();

  if (!destination) return null;

  // Helper to format weight (seconds) to minutes and distance (meters) to km
  const formatStats = (route: any) => {
    if (!route || !route.properties) return '-- min • -- km';
    const mins = Math.round(route.properties.weight / 60);
    const kms = (route.properties.distance_meters / 1000).toFixed(1);
    return `${mins} min • ${kms} km`;
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      backgroundStyle={{ backgroundColor: COLORS.surface }}
      handleIndicatorStyle={{ backgroundColor: COLORS.textSecondary }}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Select Your Route</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.option,
              activeRoute === 'fastest' && styles.activeOptionFastest,
            ]}
            onPress={() => setActiveRoute('fastest')}
          >
            <Zap color={activeRoute === 'fastest' ? '#FFF' : COLORS.secondary} size={24} />
            <Text style={[styles.optionLabel, activeRoute === 'fastest' && styles.activeText]}>
              Fastest
            </Text>
            <Text style={styles.stats}>{formatStats(routes?.fastest)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              activeRoute === 'safest' && styles.activeOptionSafest,
            ]}
            onPress={() => setActiveRoute('safest')}
          >
            <ShieldCheck color={activeRoute === 'safest' ? '#FFF' : COLORS.primary} size={24} />
            <Text style={[styles.optionLabel, activeRoute === 'safest' && styles.activeText]}>
              Safest
            </Text>
            <Text style={styles.stats}>{formatStats(routes?.safest)}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startText}>Start Navigation</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  option: {
    flex: 0.48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeOptionFastest: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  activeOptionSafest: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionLabel: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  activeText: {
    color: '#FFF',
  },
  stats: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  startText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
