import { create } from 'zustand';

interface MapState {
  userLocation: [number, number] | null;
  destination: [number, number] | null;
  activeRoute: 'fastest' | 'safest';
  routes: {
    fastest: any;
    safest: any;
  } | null;
  sosAlerts: Array<{ id: string; location: [number, number] }>;
  setUserLocation: (location: [number, number]) => void;
  setDestination: (location: [number, number] | null) => void;
  setActiveRoute: (route: 'fastest' | 'safest') => void;
  setRoutes: (routes: { fastest: any; safest: any } | null) => void;
  addSosAlert: (alert: { id: string; location: [number, number] }) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isNavigating: boolean;
  setIsNavigating: (navigating: boolean) => void;
  recentSearches: { id: string; place_name: string; center: [number, number] }[];
  addRecentSearch: (search: { id: string; place_name: string; center: [number, number] }) => void;
}

export const useStore = create<MapState>((set) => ({
  userLocation: null,
  destination: null,
  activeRoute: 'safest',
  routes: null,
  sosAlerts: [],
  setUserLocation: (location) => set({ userLocation: location }),
  setDestination: (location) => set({ destination: location }),
  setActiveRoute: (route) => set({ activeRoute: route }),
  setRoutes: (routes) => set({ routes }),
  addSosAlert: (alert) => set((state) => {
    const isDuplicate = state.sosAlerts.some((a) => a.id === alert.id);
    if (isDuplicate) return state;
    return { sosAlerts: [...state.sosAlerts, alert] };
  }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  isNavigating: false,
  setIsNavigating: (navigating) => set({ isNavigating: navigating }),
  recentSearches: [],
  addRecentSearch: (search) => set((state) => {
    // Keep only unique searches, max 2
    const filtered = state.recentSearches.filter(s => s.id !== search.id);
    return { recentSearches: [search, ...filtered].slice(0, 2) };
  }),
}));
