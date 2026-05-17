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
  addSosAlert: (alert) => set((state) => ({ sosAlerts: [...state.sosAlerts, alert] })),
}));
