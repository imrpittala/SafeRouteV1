import polyline from '@mapbox/polyline';

export const decodeValhallaShape = (shapeString: string, summary?: any) => {
  if (!shapeString) return null;

  // IMPORTANT: Valhalla uses precision 6 (factor of 1e6), not standard 5
  const geojsonGeometry = polyline.toGeoJSON(shapeString, 6);

  return {
    type: 'Feature',
    properties: {
      time: summary?.time || 0,
      length: summary?.length || 0
    },
    geometry: geojsonGeometry, // LineString [lon, lat]
  };
};
