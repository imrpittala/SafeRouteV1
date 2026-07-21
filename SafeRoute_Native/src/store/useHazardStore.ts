import { create } from 'zustand';
import debounce from 'lodash.debounce';
import { fetchHazardsByBoundingBox, createHazard, Hazard, HazardType } from '../api/hazards';

export interface BoundingBox {
  ne: [number, number]; // [lon, lat]
  sw: [number, number]; // [lon, lat]
}

interface HazardState {
  hazards: Hazard[];
  isLoading: boolean;
  lastFetchCenter: [number, number] | null;
  fetchNearbyHazards: (bounds: BoundingBox, center: [number, number]) => void;
  reportHazard: (type: HazardType, lon: number, lat: number) => Promise<void>;
}

// Approx 111 meters threshold to prevent micro-panning network spam
const DISTANCE_THRESHOLD = 0.001; 

export const useHazardStore = create<HazardState>((set, get) => {
  // 500ms debounce to wait for user to stop panning
  const debouncedFetch = debounce(async (bounds: BoundingBox, center: [number, number]) => {
    const { lastFetchCenter } = get();

    // Minimum Delta Check based on center movement
    if (lastFetchCenter) {
      const deltaLon = Math.abs(center[0] - lastFetchCenter[0]);
      const deltaLat = Math.abs(center[1] - lastFetchCenter[1]);
      if (deltaLat < DISTANCE_THRESHOLD && deltaLon < DISTANCE_THRESHOLD) {
        return; // Delta too small, skip fetch
      }
    }

    set({ isLoading: true });
    try {
      // Mapbox provides exact bounds: [lon, lat]
      const min_lon = bounds.sw[0];
      const min_lat = bounds.sw[1];
      const max_lon = bounds.ne[0];
      const max_lat = bounds.ne[1];

      const data = await fetchHazardsByBoundingBox(min_lon, min_lat, max_lon, max_lat);
      
      // Update state and cache this region center
      set({ hazards: data, lastFetchCenter: center });
    } catch (error) {
      console.warn('Failed to fetch nearby hazards:', error);
    } finally {
      set({ isLoading: false });
    }
  }, 500);

  return {
    hazards: [],
    isLoading: false,
    lastFetchCenter: null,

    fetchNearbyHazards: (bounds: BoundingBox, center: [number, number]) => {
      // Fire the debounced function, preventing spam
      debouncedFetch(bounds, center);
    },

    reportHazard: async (type: HazardType, lon: number, lat: number) => {
      try {
        const newHazard = await createHazard(type, lon, lat);
        // Optimistically update the UI
        set((state) => ({ hazards: [...state.hazards, newHazard] }));
      } catch (error) {
        console.warn('Failed to report hazard:', error);
      }
    }
  };
});
