export const MOCK_DESTINATION_COORDS: [number, number] = [78.4116, 17.4841]; // Kukatpally Metro

export const MOCK_ROUTES = {
  fastest: {
    type: 'Feature',
    properties: {
      weight: 420, // 7 min
      distance_meters: 1500, // 1.5 km
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [78.3986, 17.4841], // Start
        [78.4020, 17.4841],
        [78.4060, 17.4841],
        [78.4116, 17.4841], // End
      ],
    },
  },
  safest: {
    type: 'Feature',
    properties: {
      weight: 780, // 13 min
      distance_meters: 2200, // 2.2 km
    },
    geometry: {
      type: 'LineString',
      coordinates: [
        [78.3986, 17.4841], // Start
        [78.3986, 17.4880], // Safe detour North
        [78.4060, 17.4880],
        [78.4060, 17.4841],
        [78.4116, 17.4841], // End
      ],
    },
  },
};
