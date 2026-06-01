import { create } from 'zustand';

export interface SOSAlert {
  userId: string;
  location: { lat: number; lng: number };
  timestamp: string;
  type: string;
  status: 'active' | 'resolved';
}

interface SystemState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  systemStatus: 'healthy' | 'warning' | 'critical';
  setSystemStatus: (status: 'healthy' | 'warning' | 'critical') => void;
  alerts: SOSAlert[];
  addAlert: (alert: SOSAlert) => void;
  resolveAlert: (userId: string, timestamp: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  focusedLocation: { lat: number; lng: number } | null;
  setFocusedLocation: (location: { lat: number; lng: number } | null) => void;
}

export const useStore = create<SystemState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  systemStatus: 'healthy',
  setSystemStatus: (status) => set({ systemStatus: status }),
  alerts: [],
  addAlert: (alert) => set((state) => {
    // Check if we already have this alert or a very recent alert from this user within 5 seconds
    const isDuplicate = state.alerts.some(a => 
      a.userId === alert.userId && 
      Math.abs(new Date(a.timestamp).getTime() - new Date(alert.timestamp).getTime()) < 5000
    );
    
    if (isDuplicate) return state;

    const newAlerts = [alert, ...state.alerts].slice(0, 50); // Keep last 50
    return { 
      alerts: newAlerts,
      systemStatus: newAlerts.length > 0 ? 'warning' : 'healthy'
    };
  }),
  resolveAlert: (userId, timestamp) => {
    // Send API request to resolve in PostgreSQL & Redis
    const url = import.meta.env.VITE_BACKEND_API_URL || 'http://20.40.61.11:8000';
    fetch(`${url}/api/sos/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    }).catch((err) => {
      console.error('Failed to notify backend of SOS resolution:', err);
    });

    set((state) => {
      const newAlerts = state.alerts.filter(a => !(a.userId === userId && a.timestamp === timestamp));
      return { 
        alerts: newAlerts,
        systemStatus: newAlerts.length > 0 ? 'warning' : 'healthy'
      };
    });
  },
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  focusedLocation: null,
  setFocusedLocation: (location) => set({ focusedLocation: location }),
}));
