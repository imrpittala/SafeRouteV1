import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions, Easing, ScrollView, Platform } from 'react-native';
import { X, User, MapPin, History, ShieldAlert, Settings, Info, Navigation, Download, CloudMoon, Clock, ChevronRight, Share2, LogIn } from 'lucide-react-native';
import { COLORS as FallbackColors, useThemeColors, SPACING } from '../../theme/theme';
import { useStore } from '../../store/useStore';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const COLORS = useThemeColors();
  const { user, isLiveSharing, themePreference, setActiveSettingsView, setAuthSheetVisible } = useStore();
  const [isRendered, setIsRendered] = useState(isOpen);
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
      });
    }
  }, [isOpen]);

  if (!isRendered) return null;

  const handleOpenView = (view: string) => {
    setActiveSettingsView(view);
    onClose();
  };

  return (
    <View style={styles.overlayContainer} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Dim Background */}
      <Animated.View style={[styles.dimOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Spatial Sidebar Panel */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          {user ? (
            <>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileText}>{user.displayName ? user.displayName.charAt(0) : 'U'}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{user.displayName || 'Urban Commuter'}</Text>
                <Text style={styles.profileSubtitle}>SafeRoute Pioneer • 1,200 Safe Miles</Text>
              </View>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.signInButton} 
              onPress={() => {
                onClose();
                setAuthSheetVisible(true);
              }}
            >
              <View style={styles.profileAvatarGhost}>
                <LogIn color="#FFF" size={24} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Sign In / Register</Text>
                <Text style={styles.profileSubtitle}>Sync places, unlock safety features</Text>
              </View>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color="#FFF" size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Profile Actions (if logged in) */}
          {user && (
            <View style={{ marginBottom: SPACING.md }}>
              <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('profile')}>
                <View style={styles.iconBox}><User color="#FFF" size={20} /></View>
                <View style={styles.rowTextCol}>
                  <Text style={styles.rowTitle}>My Profile & Account</Text>
                </View>
                <ChevronRight color="#555" size={20} />
              </TouchableOpacity>
            </View>
          )}

          {/* Core Navigation */}
          <Text style={styles.sectionTitle}>Navigation</Text>
          <View style={styles.sectionBlock}>
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('saved_places')}>
              <View style={styles.iconBox}><MapPin color="#FFF" size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Saved Places</Text>
                <Text style={styles.rowSubtitle}>Set Home, Work & Favorites</Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('recent_trips')}>
              <View style={styles.iconBox}><History color="#FFF" size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Recent Trips</Text>
                <Text style={styles.rowSubtitle}>View your timeline history</Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
          </View>

          {/* SafeRoute Exclusives */}
          <Text style={styles.sectionTitle}>SafeRoute Shield</Text>
          <View style={styles.sectionBlock}>
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('emergency')}>
              <View style={styles.iconBoxShield}><ShieldAlert color="#000" size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Emergency Contacts</Text>
                <Text style={styles.rowSubtitle}>Manage SOS broadcast list</Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('location_sharing')}>
              <View style={styles.iconBox}><Share2 color={isLiveSharing ? COLORS.primary : "#FFF"} size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Location Sharing</Text>
                <Text style={styles.rowSubtitle}>{isLiveSharing ? "Live sharing active" : "Share live route with others"}</Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('safety_preferences')}>
              <View style={styles.iconBox}><Navigation color="#FFF" size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Safety Preferences</Text>
                <Text style={styles.rowSubtitle}>Well-lit routes, crime avoidance</Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.sectionBlock}>
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('theme')}>
              <View style={styles.iconBox}><CloudMoon color="#FFF" size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Theme & Appearance</Text>
                <Text style={styles.rowSubtitle}>
                  {themePreference === 'auto' ? 'Auto-adapt by Time Enabled' : themePreference === 'light' ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('nav_settings')}>
              <View style={styles.iconBox}><Settings color="#FFF" size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Navigation Settings</Text>
                <Text style={styles.rowSubtitle}>Voice, toll avoidance</Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('offline_maps')}>
              <View style={styles.iconBox}><Download color="#FFF" size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Offline Maps</Text>
                <Text style={styles.rowSubtitle}>Download regions for SOS support</Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
          </View>

          {/* Support & Legal */}
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <View style={styles.sectionBlock}>
            <TouchableOpacity style={styles.rowItem} onPress={() => handleOpenView('support')}>
              <View style={styles.iconBox}><Info color="#FFF" size={20} /></View>
              <View style={styles.rowTextCol}>
                <Text style={styles.rowTitle}>Help & Feedback</Text>
              </View>
              <ChevronRight color="#555" size={20} />
            </TouchableOpacity>
          </View>

          {/* Trademark & Footer */}
          <View style={styles.footer}>
            <Text style={styles.trademark}>L4XM1™</Text>
            <Text style={styles.versionInfo}>SafeRoute Version 1.0.0 (Spatial UI)</Text>
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999, // Ensure it's above absolutely everything
    elevation: 9999,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0F0F0F', // Spatial dark grey/black
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: SPACING.xl,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  profileAvatarGhost: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  profileName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  profileSubtitle: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
  },
  scrollContent: {
    flex: 1,
    padding: SPACING.md,
  },
  sectionTitle: {
    color: '#777',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  sectionBlock: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBoxShield: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF', // High contrast for SOS
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  rowTextCol: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  rowTitle: {
    color: '#EEE',
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginLeft: 60, // Align with text
  },
  footer: {
    marginTop: 40,
    marginBottom: 60,
    alignItems: 'center',
  },
  trademark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    opacity: 0.6,
    marginBottom: 4,
  },
  versionInfo: {
    color: '#555',
    fontSize: 12,
    fontWeight: '600',
  },
});
