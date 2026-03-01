import { create } from 'zustand';

type RouteType = 'fastest' | 'safest';

interface AppState {
    activeRoute: RouteType;
    setActiveRoute: (route: RouteType) => void;
    isSOSActive: boolean;
    triggerSOS: () => void;
    cancelSOS: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    activeRoute: 'fastest',
    setActiveRoute: (route) => set({ activeRoute: route }),
    isSOSActive: false,
    triggerSOS: () => set({ isSOSActive: true }),
    cancelSOS: () => set({ isSOSActive: false }),
}));
