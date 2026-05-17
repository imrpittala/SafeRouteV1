# SafeRoute System Walkthrough: What We Built

We have constructed a full-stack, real-time crisis response system. Below is a comprehensive overview of how we integrated the **React Native App**, **Python FastAPI Backend**, and **React Vite Admin Dashboard**.

---

## 1. The Foundation: Python FastAPI Backend (`SafeRoute_Backend`)
We built a resilient event-driven architecture to act as the central nervous system.

*   **REST Ingestion (`/api/alerts/sos`)**: We established a standard `POST` endpoint to catch incoming emergency payloads from the native application.
*   **WebSocket Broker (`/ws/admin`)**: Built a `ConnectionManager` to keep persistent dual-way sockets open with one or more City Admin dashboards. 
*   **Real-time Broadcasting**: The millisecond a REST `POST` request hits the SOS endpoint, the backend asynchronously iterates through all connected WebSockets and pushes the JSON payload to the admin dashboards instantly.
*   **Networking Configuration**: We implemented strict CORS middleware, allowing credentials and bridging the connections across `localhost`, the `192.168.50.17` local hotspot network, and Vercel production networks.

---

## 2. The Trigger: React Native App (`SafeRoute_Native`)
We overhauled the mobile app to be highly resilient to network drops and compliant with the latest New Architecture.

*   **Offline-First SOS Queue**: 
    *   Rebuilt the `SOSButton` component tightly around `@react-native-community/netinfo` and `AsyncStorage`.
    *   If a user triggers an SOS and the device is offline, the payload gracefully errors out, catches, and gets strictly cached to local storage. 
    *   When `NetInfo` confirms a network restoration, the system automatically loops through the queue, mass-syncing stored payloads to the backend and cleaning the queue.
*   **Fabric Engine & SDK 55 Overhaul**: 
    *   Force-upgraded the Expo SDK to version 55. 
    *   Refactored the core `<MapView>` element in `MapScreen.tsx` to strictly use `flex: 1` rather than `StyleSheet.absoluteFillObject` so the map renders flawlessly under the new Fabric rendering engine instead of collapsing. 
    *   Injected the `expo-build-properties` plugin into `app.json` to safely bundle the Google Maps binary natively.

---

## 3. The Monitor: Admin Dashboard (`SafeRoute_Admin`)
We configured the React Admin web client to dynamically listen to the system's pulse and alert operators loudly.

*   **Vite Global Environment Configuration**:
    *   Added a strict `.env` pipeline (`VITE_BACKEND_WS_URL`) allowing local development, hotspot routing (like `192.168.50.17:8000`), and production to fluidly target the correct backend without exposing hardcoded strings.
*   **Persistent WebSockets**:
    *   Wired the core `App.tsx` layout layer to open WebSockets against `/ws/admin` upon mount and parse incoming broadcast events.
*   **Crisis User Interface**: 
    *   Whenever an `SOS` JSON payload breezes down the WebSocket pipeline, the state updates to display a prominent, pulsing red global overlay across the system, detailing the `User ID` and precise Coordinate Tracking. 
    *   The alerts are dismissible but are permanently logged within the "Incident Reports Database" tab for eventual operator resolution. 
*   **Clean Baseline**: Fixed lingering TypeScript `noUnusedLocals` linting failures inside `TuningPanel.tsx` ensuring strict compilation going forward.

---

### End-to-End Test Flow
1. Start the backend: `python -m uvicorn main:app --host 0.0.0.0`
2. Start the Admin dashboard: `npm run dev`
3. Serve Mobile App: `npx expo start --clear`
4. The moment the user's 3-second SOS countdown hits *zero*, the Mobile App queries the `192.168.x.x:8000` REST API. FastAPI ingests the JSON, loops the active WebSockets, and blasts it to `192.168.x.x:5173`, successfully igniting the flashing red alarms on the Admin's web browser screen.
