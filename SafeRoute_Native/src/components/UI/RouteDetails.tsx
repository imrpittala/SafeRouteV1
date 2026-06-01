import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { COLORS, SPACING } from '../../theme/theme';
import { useStore } from '../../store/useStore';
import { Zap, ShieldCheck, X, Navigation, ArrowUpRight, AlertTriangle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const RouteDetails = () => {
  const { 
    activeRoute, setActiveRoute, routes, setRoutes, destination, 
    isLoading, isNavigating, setIsNavigating, setDestination, routeBlocked
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
        
        <View style={[styles.singleRouteInfo, routeBlocked ? styles.blockedAlertBorder : styles.safeAlertBorder]}>
          {routeBlocked ? (
            <AlertTriangle color={COLORS.danger} size={28} style={{ marginRight: SPACING.md }} />
          ) : (
            <ShieldCheck color={COLORS.primary} size={28} style={{ marginRight: SPACING.md }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.singleRouteTitle}>
              {routeBlocked ? 'Direct Route Only' : 'Optimal Safe Route Selected'}
            </Text>
            <Text style={styles.singleRouteDescription}>
              {routeBlocked 
                ? 'All detours blocked. Proceeding with caution.' 
                : 'No active hazards detected along this route.'}
            </Text>
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

  // Calculate difference in time
  const fastestMins = routes?.fastest ? Math.round(routes.fastest.properties.weight / 60) : 0;
  const safestMins = routes?.safest ? Math.round(routes.safest.properties.weight / 60) : 0;
  const timeDiff = safestMins - fastestMins;

  return (
    <View style={styles.bottomCard}>
      <View style={styles.dragHandle} />
      <Text style={styles.title}>Select Your Route</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.option,
            activeRoute === 'fastest' ? styles.activeOptionFastest : styles.inactiveOption,
          ]}
          onPress={() => setActiveRoute('fastest')}
        >
          <View style={[styles.iconCircle, activeRoute === 'fastest' ? styles.iconCircleActiveFastest : styles.iconCircleInactive]}>
            <Zap color={activeRoute === 'fastest' ? '#007AFF' : COLORS.secondary} size={20} />
          </View>
          <Text style={[styles.optionLabel, activeRoute === 'fastest' && styles.activeText]}>
            Fastest
          </Text>
          <Text style={[styles.stats, activeRoute === 'fastest' && styles.activeText]}>{formatStats(routes?.fastest)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            activeRoute === 'safest' ? styles.activeOptionSafest : styles.inactiveOption,
          ]}
          onPress={() => setActiveRoute('safest')}
        >
          <View style={[styles.iconCircle, activeRoute === 'safest' ? styles.iconCircleActiveSafest : styles.iconCircleInactive]}>
            <ShieldCheck color={activeRoute === 'safest' ? '#00B074' : COLORS.primary} size={20} />
          </View>
          <Text style={[styles.optionLabel, activeRoute === 'safest' && styles.activeText]}>
            Safest
          </Text>
          <Text style={[styles.stats, activeRoute === 'safest' && styles.activeText]}>
            {formatStats(routes?.safest)}
            {timeDiff > 0 ? ` (+${timeDiff} min)` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Detour Status Badges */}
      {activeRoute === 'safest' ? (
        <View style={[styles.statusBadge, routeBlocked ? styles.badgeCaution : styles.badgeSuccess]}>
          {routeBlocked ? (
            <>
              <AlertTriangle color={COLORS.danger} size={16} style={{ marginRight: SPACING.xs }} />
              <Text style={styles.badgeTextCaution}>
                Caution: Alternate route selected. Exposure minimized.
              </Text>
            </>
          ) : (
            <>
              <ShieldCheck color={COLORS.primary} size={16} style={{ marginRight: SPACING.xs }} />
              <Text style={styles.badgeTextSuccess}>
                Safety Detour Active (Avoiding emergency zones)
              </Text>
            </>
          )}
        </View>
      ) : (
        <View style={[styles.statusBadge, styles.badgeDanger]}>
          <AlertTriangle color={COLORS.danger} size={16} style={{ marginRight: SPACING.xs }} />
          <Text style={styles.badgeTextDanger}>
            Warning: Route passes through active emergency zones.
          </Text>
        </View>
      )}

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
    backgroundColor: 'rgba(20, 20, 20, 0.88)', // Glassmorphic dark
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
    alignItems: 'center',
  },
  // Navigation Mode Styles
  topBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
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
    top: 170,
    left: SPACING.md,
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  speedText: {
    color: '#FFF',
    fontSize: 22,
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
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
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
    backgroundColor: 'rgba(255, 59, 48, 0.15)', // Light red background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.danger,
  },
  navInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  navTimeRemaining: {
    color: COLORS.danger, // Red text for ETA like Mappls
    fontSize: 26,
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    alignSelf: 'flex-start',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.md,
  },
  option: {
    flex: 0.48,
    borderRadius: 20,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  inactiveOption: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeOptionFastest: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
  },
  activeOptionSafest: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  iconCircleInactive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconCircleActiveFastest: {
    backgroundColor: '#FFF',
  },
  iconCircleActiveSafest: {
    backgroundColor: '#FFF',
  },
  optionLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  activeText: {
    color: '#FFF',
    fontWeight: '700',
  },
  stats: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  statusBadge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 14,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  badgeCaution: {
    backgroundColor: 'rgba(255, 149, 0, 0.08)',
    borderColor: 'rgba(255, 149, 0, 0.2)',
  },
  badgeDanger: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  badgeTextSuccess: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  badgeTextCaution: {
    color: '#FF9500',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  badgeTextDanger: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  startButton: {
    backgroundColor: COLORS.accent,
    width: '100%',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  startText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  singleRouteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    padding: SPACING.md,
    width: '100%',
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  safeAlertBorder: {
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
    borderColor: 'rgba(52, 199, 89, 0.15)',
  },
  blockedAlertBorder: {
    backgroundColor: 'rgba(255, 149, 0, 0.06)',
    borderColor: 'rgba(255, 149, 0, 0.15)',
  },
  singleRouteTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  singleRouteDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  singleRouteStats: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
});
