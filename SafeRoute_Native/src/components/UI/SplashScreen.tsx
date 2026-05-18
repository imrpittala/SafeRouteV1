import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Easing, Platform } from 'react-native';
import { Shield } from 'lucide-react-native';
import { COLORS } from '../../theme/theme';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width, height } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [statusText, setStatusText] = useState('CONNECTING TO SAFETY CHANNELS...');
  
  // Animation drivers
  const fadeAnim = useRef(new Animated.Value(1)).current;       // Full splash fade out
  const scaleAnim = useRef(new Animated.Value(0.3)).current;    // Logo spring entry
  const rotateAnim = useRef(new Animated.Value(0)).current;     // Radar line rotation
  const pulse1 = useRef(new Animated.Value(0)).current;         // Concentric radar ring 1
  const pulse2 = useRef(new Animated.Value(0)).current;         // Concentric radar ring 2
  const textFade = useRef(new Animated.Value(0)).current;       // Status text fade

  useEffect(() => {
    // 1. Initial Logo spring & radar sweeping
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 15,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      )
    ]).start();

    // 2. Infinite pulse wave looping (concentric radar sweep)
    const runPulse = () => {
      pulse1.setValue(0);
      pulse2.setValue(0);
      Animated.stagger(800, [
        Animated.loop(
          Animated.timing(pulse1, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ),
        Animated.loop(
          Animated.timing(pulse2, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        )
      ]).start();
    };
    runPulse();

    // 3. Status text sequence rolling
    const textSequence = [
      { text: 'ESTABLISHING SECURE GATEWAYS...', delay: 900 },
      { text: 'MAPPING ACTIVE EMERGENCIES...', delay: 1800 },
      { text: 'ROUTING ENGINES ACTIVE. SHIELD ENGAGED.', delay: 2700 }
    ];

    Animated.timing(textFade, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    textSequence.forEach((step, index) => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(textFade, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(100),
          Animated.timing(textFade, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start();
        
        setTimeout(() => setStatusText(step.text), 200);
      }, step.delay);
    });

    // 4. Clean exit sequence
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 3600);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale1 = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 2.2],
  });

  const pulseOpacity1 = pulse1.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.4, 0],
  });

  const pulseScale2 = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 2.2],
  });

  const pulseOpacity2 = pulse2.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.4, 0],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Dynamic Grid Background overlay */}
      <View style={styles.gridOverlay} />

      <View style={styles.logoWrapper}>
        {/* Pulsing Concentric Radar Rings */}
        <Animated.View 
          style={[
            styles.pulseRing, 
            { 
              transform: [{ scale: pulseScale1 }], 
              opacity: pulseOpacity1 
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.pulseRing, 
            { 
              transform: [{ scale: pulseScale2 }], 
              opacity: pulseOpacity2 
            }
          ]} 
        />

        {/* Dynamic Rotating Sweep Line */}
        <Animated.View style={[styles.radarSweep, { transform: [{ rotate: spin }] }]} />

        {/* Core Animated Shield Icon Container */}
        <Animated.View style={[styles.logoCore, { transform: [{ scale: scaleAnim }] }]}>
          <Shield size={64} color="#10b981" strokeWidth={1.8} />
          {/* Internal Glowing Radar Dot */}
          <View style={styles.radarDot} />
        </Animated.View>
      </View>

      {/* Branding Typography & Load Sequence */}
      <View style={styles.textContainer}>
        <Text style={styles.brandTitle}>S A F E R O U T E</Text>
        <Text style={styles.brandSubtitle}>INTELLIGENT SECURE NAVIGATION</Text>
        
        <Animated.Text style={[styles.statusText, { opacity: textFade }]}>
          {statusText}
        </Animated.Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>SECURED BY DEEPMIND ADVANCED COGNITION</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09090b', // Ultra-premium black
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it mounts above everything
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    borderWidth: 1,
    borderColor: '#FFF',
    // Generates a nice tech grid using dotted pattern
    borderStyle: 'dashed',
  },
  logoWrapper: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)', // Soft green glow
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  radarSweep: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
    borderLeftColor: 'rgba(16, 185, 129, 0.4)', // The actual sweeper line
  },
  logoCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#18181b', // Matte dark surface
    borderWidth: 2,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  radarDot: {
    position: 'absolute',
    top: 30,
    right: 32,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6', // Glowing blue response indicator
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  textContainer: {
    marginTop: 50,
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 10,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#a1a1aa',
    letterSpacing: 4,
    marginTop: 10,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981', // Neon safety green
    letterSpacing: 2,
    marginTop: 40,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    textAlign: 'center',
    height: 30,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
  },
  footerText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#3f3f46',
    letterSpacing: 2,
  },
});
