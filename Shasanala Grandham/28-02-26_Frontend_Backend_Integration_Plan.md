# Frontend Integration Implementation Plan

## Goal Description
Integrate the existing frontend applications (`SafeRoute_Native` and `SafeRoute_Admin`) with the newly created real-time Python backend. The Native app needs an offline-first SOS trigger, and the Admin dashboard needs a WebSocket listener to display incoming alerts prominently.

## User Review Required
> [!IMPORTANT]
> Please review the proposed approach for offline caching in the native app and the WebSocket integration in the admin dashboard. Let me know if you would like any specific UI components updated for the admin dashboard (e.g., adding a dedicated SOS panel).

## Proposed Changes

### Phase 1: React Native Mobile App (The Trigger & Offline Queue)
**Dependencies to Install:** `axios`, `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`

#### [NEW/MODIFY] `c:\SafeRoute\SafeRoute_Native\src\components\SOSTrigger.tsx` (or update existing `SOSButton.tsx`)
Create or update the SOS button component to include the offline-first logic:
1.  **Dependencies:** Import `axios`, `AsyncStorage`, and `NetInfo`.
2.  **Action Payload:** Build the payload `{"userId": "user-...", "location": {"lat": 12.9716, "lng": 77.5946}, "timestamp": "...", "type": "SOS"}` on button press.
3.  **Offline Logic:** Check the network status via `NetInfo`.
    *   **ONLINE:** Send `axios.post` to the backend.
    *   **OFFLINE:** Push the serialized payload to a local "SOS Queue" array in `AsyncStorage`.
4.  **Retry Logic:** Setup a `useEffect` with a `NetInfo` listener. Upon regaining internet connection, retrieve the queue from `AsyncStorage`, loop through the cached alerts to POST them to the server, and clear the queue upon successful transmission.

### Phase 2: React JS Admin Dashboard (The Listener)
**Dependencies to Install:** None (using standard browser WebSockets).

#### [MODIFY] `c:\SafeRoute\SafeRoute_Admin\src\App.tsx` (or a dedicated component)
Implement the real-time listener and UI updates:
1.  **WebSocket Hook:** Add a `useEffect` to establish a `WebSocket` connection to `ws://localhost:8000/ws/admin` using the browser's native API. Make sure to close the socket on component unmount.
2.  **State Management:** Create an `alerts` state array using `useState`. Use the `onmessage` event listener to `JSON.parse` incoming strings and prepend (`[newAlert, ...prevAlerts]`) them to the state array.
3.  **UI Updates:** Render the alerts list in the UI (potentially as a floating overlay or inside the `reports` tab). Use Tailwind classes to style these alerts prominently (e.g., `bg-red-600 animate-pulse font-bold text-white`) so they stand out immediately when received.

## Verification Plan
1.  **Mobile App:** Trigger an SOS while offline (e.g., disconnecting the device/emulator network). Verify it saves to storage. Turn the network back on and verify it automatically syncs with the backend.
2.  **Admin Dashboard:** Open the React web app. Verify it connects to the WebSocket upon mounting. Trigger an SOS (via the mobile app or curl) and verify the dashboard instantly displays the flashing red alert.
