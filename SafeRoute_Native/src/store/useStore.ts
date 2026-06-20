import { create } from 'zustand';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { apiClient } from '../api/client';

interface MapState {
  userLocation: [number, number] | null;
  destination: [number, number] | null;
  selectedPoi: [number, number] | null;
  origin: [number, number] | null;
  isRoutingMode: boolean;
  searchQuery: string;
  activeRoute: 'fastest' | 'safest';
  routes: {
    fastest: any;
    safest: any;
  } | null;
  routeBlocked: boolean;
  sosAlerts: Array<{ id: string; location: [number, number] }>;
  setUserLocation: (location: [number, number]) => void;
  setDestination: (location: [number, number] | null) => void;
  setSelectedPoi: (poi: [number, number] | null) => void;
  setOrigin: (location: [number, number] | null) => void;
  setIsRoutingMode: (mode: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveRoute: (route: 'fastest' | 'safest') => void;
  setRoutes: (routes: { fastest: any; safest: any } | null) => void;
  setRouteBlocked: (blocked: boolean) => void;
  addSosAlert: (alert: { id: string; location: [number, number] }) => void;
  removeSosAlert: (id: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isNavigating: boolean;
  setIsNavigating: (navigating: boolean) => void;
  recentSearches: { id: string; place_name: string; center: [number, number] }[];
  addRecentSearch: (search: { id: string; place_name: string; center: [number, number] }) => void;
  clearRecentSearches: () => void;
  
  // Settings & Sidebar State
  user: FirebaseAuthTypes.User | null;
  isAuthenticated: boolean;
  isAuthSheetVisible: boolean;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setAuthSheetVisible: (visible: boolean) => void;
  signOut: () => void;
  fetchUserData: () => Promise<void>;
  
  savedPlaces: { id: string; place_name: string; center: [number, number]; label: 'Home' | 'Work' | 'Custom' | null; customLabel?: string }[];
  addSavedPlace: (place: { id: string; place_name: string; center: [number, number]; label: 'Home' | 'Work' | 'Custom' | null; customLabel?: string }) => Promise<void>;
  removeSavedPlace: (id: string) => Promise<void>;
  
  sosContacts: { id: string; name: string; phone: string; isEnabled: boolean }[];
  addSosContact: (contact: { id: string; name: string; phone: string; isEnabled: boolean }) => Promise<void>;
  removeSosContact: (id: string) => Promise<void>;
  toggleSosContact: (id: string) => void;
  
  isLiveSharing: boolean;
  setIsLiveSharing: (sharing: boolean) => void;
  
  themePreference: 'light' | 'dark' | 'auto';
  setThemePreference: (pref: 'light' | 'dark' | 'auto') => void;
  
  activeSettingsView: string | null;
  setActiveSettingsView: (view: string | null) => void;
}

export const useStore = create<MapState>((set) => ({
  userLocation: null,
  destination: null,
  selectedPoi: null,
  origin: null,
  isRoutingMode: false,
  searchQuery: '',
  activeRoute: 'safest',
  routes: null,
  routeBlocked: false,
  sosAlerts: [],
  setUserLocation: (location) => set({ userLocation: location }),
  setDestination: (location) => set({ destination: location }),
  setSelectedPoi: (poi) => set({ selectedPoi: poi }),
  setOrigin: (location) => set({ origin: location }),
  setIsRoutingMode: (mode) => set({ isRoutingMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveRoute: (route) => set({ activeRoute: route }),
  setRoutes: (routes) => set({ routes }),
  setRouteBlocked: (blocked) => set({ routeBlocked: blocked }),
  addSosAlert: (alert) => set((state) => {
    const isDuplicate = state.sosAlerts.some((a) => a.id === alert.id);
    if (isDuplicate) return state;
    return { sosAlerts: [...state.sosAlerts, alert] };
  }),
  removeSosAlert: (id) => set((state) => ({
    sosAlerts: state.sosAlerts.filter((a) => a.id !== id)
  })),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  isNavigating: false,
  setIsNavigating: (navigating) => set({ isNavigating: navigating }),
  recentSearches: [],
  addRecentSearch: (search) => set((state) => {
    const filtered = state.recentSearches.filter(s => s.id !== search.id);
    return { recentSearches: [search, ...filtered].slice(0, 4) };
  }),
  clearRecentSearches: () => set({ recentSearches: [] }),

  // Settings & Sidebar Implementation
  user: null,
  isAuthenticated: false,
  isAuthSheetVisible: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isAuthSheetVisible: false }),
  setAuthSheetVisible: (visible) => set({ isAuthSheetVisible: visible }),
  signOut: () => set({ user: null, isAuthenticated: false, savedPlaces: [], sosContacts: [] }),
  
  fetchUserData: async () => {
    try {
      const response = await apiClient.get('/users/me/data');
      if (response.data) {
        set({ 
          savedPlaces: response.data.savedPlaces || [], 
          sosContacts: response.data.sosContacts || [] 
        });
      }
    } catch (error) {
      console.warn('Failed to fetch user data', error);
    }
  },
  
  savedPlaces: [],
  addSavedPlace: async (place) => {
    try {
      const response = await apiClient.post('/users/me/places', place);
      if (response.status === 200 || response.status === 201) {
        set((state) => ({ savedPlaces: [...state.savedPlaces, place] }));
      }
    } catch (error) {
      console.warn('Failed to save place to cloud', error);
    }
  },
  removeSavedPlace: async (id) => {
    try {
      const response = await apiClient.delete(`/users/me/places/${id}`);
      if (response.status === 200 || response.status === 204) {
        set((state) => ({ savedPlaces: state.savedPlaces.filter(p => p.id !== id) }));
      }
    } catch (error) {
      console.warn('Failed to remove place from cloud', error);
    }
  },
  
  sosContacts: [],
  addSosContact: async (contact) => {
    try {
      const response = await apiClient.post('/users/me/contacts', contact);
      if (response.status === 200 || response.status === 201) {
        set((state) => ({ sosContacts: [...state.sosContacts, contact] }));
      }
    } catch (error) {
      console.warn('Failed to save SOS contact to cloud', error);
    }
  },
  removeSosContact: async (id) => {
    try {
      const response = await apiClient.delete(`/users/me/contacts/${id}`);
      if (response.status === 200 || response.status === 204) {
        set((state) => ({ sosContacts: state.sosContacts.filter(c => c.id !== id) }));
      }
    } catch (error) {
      console.warn('Failed to remove SOS contact from cloud', error);
    }
  },
  toggleSosContact: (id) => set((state) => ({
    sosContacts: state.sosContacts.map(c => c.id === id ? { ...c, isEnabled: !c.isEnabled } : c)
  })),
  
  isLiveSharing: false,
  setIsLiveSharing: (sharing) => set({ isLiveSharing: sharing }),
  
  themePreference: 'auto',
  setThemePreference: (pref) => set({ themePreference: pref }),
  
  activeSettingsView: null,
  setActiveSettingsView: (view) => set({ activeSettingsView: view }),
}));
