import { create } from 'zustand';

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
    // Keep only unique searches, max 2
    const filtered = state.recentSearches.filter(s => s.id !== search.id);
    return { recentSearches: [search, ...filtered].slice(0, 2) };
  }),
}));
