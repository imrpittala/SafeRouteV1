import { apiClient } from './client';

export type HazardType = 'CRIME' | 'UNLIT' | 'ROADBLOCK';

export interface Hazard {
  id: number;
  hazard_type: HazardType;
  coordinates: [number, number]; // Strictly [lon, lat]
  upvotes: number;
}

export const fetchHazardsByBoundingBox = async (
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number
): Promise<Hazard[]> => {
  const response = await apiClient.get<Hazard[]>('/hazards/nearby', {
    params: {
      min_lon: minLon,
      min_lat: minLat,
      max_lon: maxLon,
      max_lat: maxLat,
    },
  });
  return response.data;
};

export const createHazard = async (
  hazardType: HazardType,
  lon: number,
  lat: number
): Promise<Hazard> => {
  // Strict Guard: Prevent Ocean Spawning locally before hitting the network
  if (lon === 0.0 && lat === 0.0) {
    throw new Error('Ocean Spawning Prevented: Coordinates are 0.0, 0.0');
  }

  const response = await apiClient.post<Hazard>('/hazards/', {
    hazard_type: hazardType,
    coordinates: [lon, lat], // Enforce Lon, Lat ordering
  });
  return response.data;
};
