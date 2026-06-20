import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions, Easing, ScrollView, TextInput, Switch, Platform } from 'react-native';
import { X, ChevronLeft, MapPin, History, ShieldAlert, Settings, Info, Navigation, Download, CloudMoon, Clock, ChevronRight, Share2, LogOut, Plus, Trash2, Edit2, Search } from 'lucide-react-native';
import { COLORS as FallbackColors, useThemeColors, SPACING } from '../../theme/theme';
import { useStore } from '../../store/useStore';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

export const SettingsModal: React.FC = () => {
  const COLORS = useThemeColors();
  const { 
    activeSettingsView, setActiveSettingsView, 
    user, signOut,
    savedPlaces, addSavedPlace, removeSavedPlace,
    sosContacts, addSosContact, removeSosContact, toggleSosContact,
    isLiveSharing, setIsLiveSharing,
    themePreference, setThemePreference,
    userLocation
  } = useStore();

  const [isRendered, setIsRendered] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Search State for Saved Places
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [placeLabel, setPlaceLabel] = useState<'Home' | 'Work' | 'Custom'>('Home');
  const [customLabel, setCustomLabel] = useState('');

  // SOS Contact State
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    if (activeSettingsView) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: height, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setIsRendered(false);
        // Reset sub-states
        setIsAddingPlace(false);
        setSelectedLocation(null);
        setIsAddingContact(false);
      });
    }
  }, [activeSettingsView]);

  // Handle Search for Add Place
  useEffect(() => {
    const fetchMatches = async () => {
      if (placeQuery.length > 2) {
        try {
          const proximity = userLocation ? `&lat=${userLocation[1]}&lon=${userLocation[0]}` : '';
          const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(placeQuery)}&limit=5${proximity}`;
          
          const res = await axios.get(url);
          if (res.data && res.data.features) {
            setSearchResults(res.data.features.map((f: any) => {
              const name = f.properties.name || f.properties.street || f.properties.city;
              const formatted = [f.properties.name, f.properties.street, f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', ');
              return {
                id: Math.random().toString(),
                name: name,
                place_formatted: formatted,
                feature: { ...f, id: Math.random().toString(), place_name: formatted, text: name, center: f.geometry.coordinates }
              };
            }));
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults([]);
      }
    };
    const timer = setTimeout(fetchMatches, 300);
    return () => clearTimeout(timer);
  }, [placeQuery]);

  const handleSelectSearchResult = (suggestion: any) => {
    const feature = suggestion.feature;
    const center = feature.center; // [lng, lat]
    setSelectedLocation({
      id: feature.id,
      place_name: feature.place_name,
      center: center
    });
    setPlaceQuery(feature.text);
    setSearchResults([]);
  };

  const handleSavePlace = () => {
    if (selectedLocation) {
      addSavedPlace({
        ...selectedLocation,
        label: placeLabel === 'Custom' ? null : placeLabel,
        customLabel: placeLabel === 'Custom' ? customLabel : undefined
      });
      setIsAddingPlace(false);
      setSelectedLocation(null);
      setPlaceQuery('');
      setCustomLabel('');
    }
  };

  const handleSaveContact = () => {
    if (contactName && contactPhone) {
      addSosContact({
        id: Math.random().toString(),
        name: contactName,
        phone: contactPhone,
        isEnabled: true
      });
      setIsAddingContact(false);
      setContactName('');
      setContactPhone('');
    }
  };

  if (!isRendered) return null;

  const renderHeader = (title: string) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => setActiveSettingsView(null)} style={styles.backBtn}>
        <ChevronLeft color="#FFF" size={28} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderEmptyState = (title: string, desc: string, icon: any) => (
    <View style={styles.emptyState}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
    </View>
  );

  const renderContent = () => {
    switch (activeSettingsView) {
      case 'profile':
        return (
          <View style={styles.content}>
            {renderHeader('My Profile')}
            {user ? (
              <View style={styles.profileCard}>
                <View style={styles.profileAvatarLarge}>
                  <Text style={styles.profileAvatarText}>{user.name.charAt(0)}</Text>
                </View>
                <Text style={styles.profileNameLarge}>{user.name}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
                <View style={styles.statsBox}>
                  <Text style={styles.statsNumber}>{user.safeMiles.toLocaleString()}</Text>
                  <Text style={styles.statsLabel}>Safe Miles Navigated</Text>
                </View>
                <TouchableOpacity style={styles.dangerBtn} onPress={() => { signOut(); setActiveSettingsView(null); }}>
                  <LogOut color="#FF4444" size={20} />
                  <Text style={styles.dangerBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );

      case 'saved_places':
        return (
          <View style={styles.content}>
            {renderHeader('Saved Places')}
            {isAddingPlace ? (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Search Location</Text>
                <View style={styles.searchInputWrapper}>
                  <Search color="#888" size={20} style={{ marginLeft: 12 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for an address or place..."
                    placeholderTextColor="#666"
                    value={placeQuery}
                    onChangeText={setPlaceQuery}
                  />
                </View>
                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((item, index) => (
                      <TouchableOpacity key={index} style={styles.searchResultItem} onPress={() => handleSelectSearchResult(item)}>
                        <Text style={styles.searchResultText}>{item.name}</Text>
                        <Text style={styles.searchResultSub}>{item.place_formatted}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedLocation && (
                  <>
                    <Text style={styles.label}>Select Label</Text>
                    <View style={styles.labelRow}>
                      {['Home', 'Work', 'Custom'].map(l => (
                        <TouchableOpacity 
                          key={l} 
                          style={[styles.labelPill, placeLabel === l && styles.labelPillActive]}
                          onPress={() => setPlaceLabel(l as any)}
                        >
                          <Text style={[styles.labelPillText, placeLabel === l && styles.labelPillTextActive]}>{l}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {placeLabel === 'Custom' && (
                      <TextInput
                        style={[styles.input, { marginTop: 16 }]}
                        placeholder="Custom Name (e.g. Gym)"
                        placeholderTextColor="#666"
                        value={customLabel}
                        onChangeText={setCustomLabel}
                      />
                    )}
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSavePlace}>
                      <Text style={styles.saveBtnText}>Save Place</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' }]} onPress={() => {setIsAddingPlace(false); setSelectedLocation(null); setSearchResults([])}}>
                  <Text style={[styles.saveBtnText, { color: '#FFF' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddingPlace(true)}>
                  <Plus color="#FFF" size={24} />
                  <Text style={styles.addBtnText}>Add a Place</Text>
                </TouchableOpacity>
                
                {savedPlaces.length === 0 ? (
                  renderEmptyState('No Saved Places', 'Add your home, work, or favorite spots for 1-tap navigation.', <MapPin color="#444" size={48} />)
                ) : (
                  savedPlaces.map(place => (
                    <View key={place.id} style={styles.listItem}>
                      <View style={styles.listIconBox}>
                        <MapPin color="#FFF" size={20} />
                      </View>
                      <View style={styles.listInfo}>
                        <Text style={styles.listTitle}>{place.label || place.customLabel}</Text>
                        <Text style={styles.listSubtitle} numberOfLines={1}>{place.place_name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeSavedPlace(place.id)} style={{ padding: 10 }}>
                        <Trash2 color="#FF4444" size={20} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        );

      case 'emergency':
        return (
          <View style={styles.content}>
            {renderHeader('Emergency Contacts')}
            {isAddingContact ? (
              <View style={styles.formContainer}>
                <Text style={styles.label}>Contact Name</Text>
                <TextInput style={styles.input} placeholder="e.g. Mom" placeholderTextColor="#666" value={contactName} onChangeText={setContactName} />
                <Text style={styles.label}>Phone Number</Text>
                <TextInput style={styles.input} placeholder="+1 234 567 8900" placeholderTextColor="#666" keyboardType="phone-pad" value={contactPhone} onChangeText={setContactPhone} />
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveContact}>
                  <Text style={styles.saveBtnText}>Save Contact</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' }]} onPress={() => setIsAddingContact(false)}>
                  <Text style={[styles.saveBtnText, { color: '#FFF' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                <View style={styles.alertBanner}>
                  <ShieldAlert color="#000" size={24} />
                  <Text style={styles.alertBannerText}>These contacts will receive an SMS with your live location if you trigger an SOS.</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => setIsAddingContact(true)}>
                  <Plus color="#FFF" size={24} />
                  <Text style={styles.addBtnText}>Add Contact</Text>
                </TouchableOpacity>

                {sosContacts.length === 0 ? (
                  renderEmptyState('No SOS Contacts', 'Add trusted contacts to keep you safe on your journey.', <ShieldAlert color="#444" size={48} />)
                ) : (
                  sosContacts.map(contact => (
                    <View key={contact.id} style={styles.listItem}>
                      <View style={styles.listInfo}>
                        <Text style={styles.listTitle}>{contact.name}</Text>
                        <Text style={styles.listSubtitle}>{contact.phone}</Text>
                      </View>
                      <Switch 
                        value={contact.isEnabled} 
                        onValueChange={() => toggleSosContact(contact.id)}
                        trackColor={{ false: '#333', true: COLORS.primary }}
                        thumbColor="#FFF"
                      />
                      <TouchableOpacity onPress={() => removeSosContact(contact.id)} style={{ padding: 10, marginLeft: 10 }}>
                        <Trash2 color="#FF4444" size={20} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        );

      case 'location_sharing':
        return (
          <View style={styles.content}>
            {renderHeader('Location Sharing')}
            <View style={styles.formContainer}>
              <View style={styles.sharingCard}>
                <View style={styles.sharingHeader}>
                  <View>
                    <Text style={styles.listTitle}>Live Sharing</Text>
                    <Text style={styles.listSubtitle}>Share real-time location & battery</Text>
                  </View>
                  <Switch 
                    value={isLiveSharing} 
                    onValueChange={setIsLiveSharing}
                    trackColor={{ false: '#333', true: COLORS.primary }}
                    thumbColor="#FFF"
                  />
                </View>
                {isLiveSharing && (
                  <View style={styles.sharingLinkBox}>
                    <Text style={styles.sharingLinkText}>https://saferoute.app/track/1a2b3c4d</Text>
                    <TouchableOpacity style={styles.copyBtn}>
                      <Text style={styles.copyBtnText}>Copy Link</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        );

      case 'theme':
        return (
          <View style={styles.content}>
            {renderHeader('Theme & Appearance')}
            <View style={styles.formContainer}>
              {['auto', 'dark', 'light'].map(pref => (
                <TouchableOpacity 
                  key={pref} 
                  style={[styles.themeOption, themePreference === pref && styles.themeOptionActive]}
                  onPress={() => setThemePreference(pref as any)}
                >
                  <Text style={[styles.themeOptionText, themePreference === pref && styles.themeOptionTextActive]}>
                    {pref === 'auto' ? 'Auto-adapt by Time' : pref === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'recent_trips':
        return <View style={styles.content}>{renderHeader('Recent Trips')}{renderEmptyState('No Trips Yet', 'Complete a navigation to see your history.', <History color="#444" size={48} />)}</View>;
      case 'safety_preferences':
        return <View style={styles.content}>{renderHeader('Safety Preferences')}{renderEmptyState('Coming Soon', 'Advanced safety routing options are in development.', <Navigation color="#444" size={48} />)}</View>;
      case 'nav_settings':
        return <View style={styles.content}>{renderHeader('Navigation Settings')}{renderEmptyState('Coming Soon', 'Voice and toll settings will be available shortly.', <Settings color="#444" size={48} />)}</View>;
      case 'offline_maps':
        return <View style={styles.content}>{renderHeader('Offline Maps')}{renderEmptyState('No Maps Downloaded', 'Download a region to navigate without cellular data.', <Download color="#444" size={48} />)}</View>;
      case 'support':
        return <View style={styles.content}>{renderHeader('Support & Legal')}{renderEmptyState('Need Help?', 'Contact support at help@saferoute.com.', <Info color="#444" size={48} />)}</View>;
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.overlayContainer} pointerEvents={activeSettingsView ? 'auto' : 'none'}>
      <Animated.View style={[styles.dimOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setActiveSettingsView(null)} />
      </Animated.View>

      <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
        {renderContent()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalSheet: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F0F0F',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    padding: SPACING.xs,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  profileCard: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  profileAvatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  profileAvatarText: {
    color: '#000',
    fontSize: 40,
    fontWeight: '900',
  },
  profileNameLarge: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '800',
  },
  profileEmail: {
    color: '#888',
    fontSize: 16,
    marginTop: 4,
    marginBottom: SPACING.xl,
  },
  statsBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    marginBottom: SPACING.xl,
  },
  statsNumber: {
    color: FallbackColors.primary,
    fontSize: 36,
    fontWeight: '900',
  },
  statsLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  dangerBtnText: {
    color: '#FF4444',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FallbackColors.primary,
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: 16,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  formContainer: {
    padding: SPACING.lg,
  },
  label: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: SPACING.md,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    padding: SPACING.md,
    color: '#FFF',
    fontSize: 16,
  },
  searchResults: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: 200,
  },
  searchResultItem: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  searchResultText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  searchResultSub: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: FallbackColors.primary,
    padding: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  labelPill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  labelPillActive: {
    backgroundColor: '#FFF',
    borderColor: '#FFF',
  },
  labelPillText: {
    color: '#AAA',
    fontWeight: '600',
  },
  labelPillTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  listIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  listTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: SPACING.md,
    margin: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  alertBannerText: {
    color: '#000',
    flex: 1,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  sharingCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sharingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sharingLinkBox: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sharingLinkText: {
    color: '#2b93ff',
    fontSize: 14,
  },
  copyBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  themeOption: {
    padding: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  themeOptionActive: {
    backgroundColor: '#FFF',
  },
  themeOptionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  themeOptionTextActive: {
    color: '#000',
  },
});
