export const MOCK_USER_LOCATION = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

// 20 Mock High Risk Zones (Heatmap Points)
export const HEATMAP_POINTS = [
    { latitude: 37.7800, longitude: -122.4200, weight: 100 },
    { latitude: 37.7810, longitude: -122.4210, weight: 80 },
    { latitude: 37.7790, longitude: -122.4220, weight: 90 },
    { latitude: 37.7820, longitude: -122.4180, weight: 70 },
    { latitude: 37.7780, longitude: -122.4190, weight: 100 },
    { latitude: 37.7700, longitude: -122.4100, weight: 60 },
    { latitude: 37.7710, longitude: -122.4090, weight: 50 },
    { latitude: 37.7720, longitude: -122.4110, weight: 50 },
    { latitude: 37.7690, longitude: -122.4120, weight: 80 },
    { latitude: 37.7680, longitude: -122.4100, weight: 70 },
    { latitude: 37.7600, longitude: -122.4300, weight: 90 },
    { latitude: 37.7610, longitude: -122.4310, weight: 100 },
    { latitude: 37.7590, longitude: -122.4290, weight: 80 },
    { latitude: 37.7620, longitude: -122.4320, weight: 70 },
    { latitude: 37.7600, longitude: -122.4280, weight: 60 },
    { latitude: 37.7850, longitude: -122.4000, weight: 90 },
    { latitude: 37.7860, longitude: -122.4010, weight: 100 },
    { latitude: 37.7840, longitude: -122.4020, weight: 80 },
    { latitude: 37.7870, longitude: -122.3990, weight: 70 },
    { latitude: 37.7850, longitude: -122.3980, weight: 60 },
];

// Direct route cutting through high-risk areas
export const FASTEST_ROUTE = [
    { latitude: 37.7600, longitude: -122.4400 }, // Start
    { latitude: 37.7650, longitude: -122.4350 },
    { latitude: 37.7749, longitude: -122.4194 }, // Center
    { latitude: 37.7850, longitude: -122.4000 }, // Through danger
    { latitude: 37.7900, longitude: -122.3900 }, // End
];

// Longer route detouring around high-risk areas
export const SAFEST_ROUTE = [
    { latitude: 37.7600, longitude: -122.4400 }, // Start
    { latitude: 37.7550, longitude: -122.4300 }, // Detour South
    { latitude: 37.7500, longitude: -122.4150 },
    { latitude: 37.7600, longitude: -122.4000 }, // Avoid center
    { latitude: 37.7750, longitude: -122.3850 },
    { latitude: 37.7900, longitude: -122.3900 }, // End
];
