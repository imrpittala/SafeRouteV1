import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { COLORS, SPACING } from '../../theme/theme';
import { useStore } from '../../store/useStore';
import { Zap, ShieldCheck, X, Navigation, ArrowUpRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const RouteDetails = () => {
  const { 
    activeRoute, setActiveRoute, routes, setRoutes, destination, 
    isLoading, isNavigating, setIsNavigating, setDestination 
  } = useStore();

  // Mock speedometer for prototype
  const [speed, setSpeed] = useState(0);
  useEffect(() => {
    if (isNavigating) {
      const interval = setInterval(() => setSpeed(Math.floor(Math.random() * (45 - 30 + 1) + 30)), 2000);
      return () => clearInterval(interval);
    }
  }, [isNavigating]);

  const shouldShow = destination && !isLoading && routes;

  if (!shouldShow) return null;

  // Helper to format weight (seconds) to minutes and distance (meters) to km
  const formatStats = (route: any) => {
    if (!route || !route.properties) return '-- min • -- km';
    const mins = Math.round(route.properties.weight / 60);
    const kms = (route.properties.distance_meters / 1000).toFixed(1);
    return `${mins} min • ${kms} km`;
  };

  const currentRouteStats = formatStats(activeRoute === 'fastest' ? routes?.fastest : routes?.safest);

  if (isNavigating) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Top Turn-by-Turn Banner */}
        <View style={styles.topBanner}>
          <ArrowUpRight color="#FFF" size={40} style={styles.turnIcon} />
          <View style={styles.turnTextContainer}>
            <Text style={styles.turnDistance}>100 m</Text>
            <Text style={styles.turnInstruction}>Turn right onto Main Road</Text>
          </View>
        </View>

        {/* Floating Speedometer */}
        <View style={styles.speedometer}>
          <Text style={styles.speedText}>{speed}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
        </View>

        {/* Enhanced Bottom Bar */}
        <View style={styles.navBottomBar}>
          <TouchableOpacity 
            style={styles.closeNavButton}
            onPress={() => {
              setIsNavigating(false);
              setDestination(null);
              setRoutes(null);
            }}
          >
            <X color="#FFF" size={28} />
          </TouchableOpacity>
          
          <View style={styles.navInfo}>
            <Text style={styles.navTimeRemaining}>{currentRouteStats.split(' • ')[0]}</Text>
            <Text style={styles.navDistanceETA}>{currentRouteStats.split(' • ')[1]} • ETA 12:45 PM</Text>
          </View>
          
          <TouchableOpacity style={styles.routeOverviewButton}>
            <Navigation color={COLORS.textSecondary} size={24} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getMidpoint = (routeData: any) => {
    if (!routeData?.geometry?.coordinates?.length) return null;
    const coords = routeData.geometry.coordinates;
    return coords[Math.floor(coords.length / 2)];
  };

  const fastestMid = getMidpoint(routes?.fastest);
  const safestMid = getMidpoint(routes?.safest);
  const isSameRoute = !fastestMid || !safestMid || (fastestMid[0] === safestMid[0] && fastestMid[1] === safestMid[1]);

  if (isSameRoute) {
    return (
      <View style={styles.bottomCard}>
        <View style={styles.dragHandle} />
        
        <View style={styles.singleRouteInfo}>
          <ShieldCheck color={COLORS.primary} size={28} style={{ marginRight: SPACING.md }} />
          <View>
            <Text style={styles.singleRouteTitle}>Optimal Safe Route Selected</Text>
            <Text style={styles.singleRouteStats}>
              {formatStats(routes?.fastest || routes?.safest)}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.startButton}
          onPress={() => setIsNavigating(true)}
        >
          <Text style={styles.startText}>Start Navigation</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.bottomCard}>
      <View style={styles.dragHandle} />
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

      <TouchableOpacity 
        style={styles.startButton}
        onPress={() => setIsNavigating(true)}
      >
        <Text style={styles.startText}>Start Navigation</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: width,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: 40, // Extra padding for the bottom of the screen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    alignItems: 'center',
  },
  // Navigation Mode Styles
  topBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.secondary,
    borderRadius: 16,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  turnIcon: {
    marginRight: SPACING.md,
  },
  turnTextContainer: {
    flex: 1,
  },
  turnDistance: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  turnInstruction: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 2,
  },
  speedometer: {
    position: 'absolute',
    top: 150,
    left: SPACING.md,
    backgroundColor: COLORS.surface,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  speedText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  speedUnit: {
    color: COLORS.textSecondary,
    fontSize: 10,
    marginTop: -2,
  },
  navBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: width,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  closeNavButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 59, 48, 0.2)', // Light red background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  navInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  navTimeRemaining: {
    color: COLORS.danger, // Red text for ETA like Mappls
    fontSize: 24,
    fontWeight: 'bold',
  },
  navDistanceETA: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  routeOverviewButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 2,
    marginBottom: SPACING.md,
    opacity: 0.5,
  },
  title: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
    alignSelf: 'flex-start',
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
  },
  startText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  singleRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: SPACING.md,
    width: '100%',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  singleRouteTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  singleRouteStats: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
