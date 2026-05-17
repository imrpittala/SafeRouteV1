# Admin Phase 2 Report: The "Overwatch" Live Map

## Phase Objectives Met
- [x] Integrate `react-map-gl` for real-time geospatial rendering
- [x] Configure Mapbox Public Token in `.env`
- [x] Implement WebSocket hook for `/ws/sos` (using `/ws/admin` for mission control)
- [x] Render active alerts as pulsing markers with interactive tooltips
- [x] Build activity feed sidebar with alert interaction (Fly to, Resolve)

## UI Components Created
- `MapView.tsx`: Core Mapbox component with custom pulsing markers and legend.
- `LiveMap.tsx`: Page layout combining the map and the activity feed.
- `useWebSocket.ts`: Hook for managing real-time connections and SOS state sync.
- `Dashboard.tsx`: Completed dashboard overview with performance metrics.

## Mock Data Used for Testing
- `simulateAlert()`: Function triggered via UI to inject mock SOS alerts into the store.
- Real-time UI updates tested via Zustand state propagation.

## package.json Updates & Startup
Added:
- `mapbox-gl`: Native Mapbox engine
- `react-map-gl`: React wrapper for Mapbox
Removed:
- `leaflet` & `react-leaflet`: Migrated to Mapbox for premium visuals.

Startup Command:
```bash
npm run dev
```
