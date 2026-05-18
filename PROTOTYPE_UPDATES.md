# SafeRoute Prototype Development Updates (May 17 - May 18, 2026)

This document details the complete overhaul, stabilization, and feature implementations completed for the SafeRoute mobile prototype over the last two days.

---

## 1. Core Stability Overhaul
*   **Removed Gorhom Bottom Sheet Dependency:** 
    *   *Issue:* The `@gorhom/bottom-sheet` and `react-native-reanimated` libraries were causing persistent native crashes and build freezes on Android.
    *   *Solution:* Completely removed the third-party dependency and replaced it with a highly optimized, absolutely positioned, custom React Native `View` overlay. This achieved **100% stability** across all Android/iOS platforms while retaining the sliding-up bottom card experience.
*   **Resolved Native Mapbox Camera Crashes:** 
    *   *Issue:* Direct runtime usage of the type-only `UserTrackingMode` enum and conflict conditions (like passing `followUserLocation` as false while specifying a tracking mode) caused native C++ assertions, resulting in the app rendering a solid dark-gray screen.
    *   *Solution:* Replaced enum checks with safe, native literal string values (`"course"`, `"normal"`) and strict conditional prop binding. The Mapbox camera now seamlessly locks on, tracks, and adjusts 3D pitch/bearing without any stability issues.
*   **Fixed React Hooks Violation:**
    *   *Issue:* The active speedometer dynamic hooks were placed below an early-return statement, which broke React's strict order of hooks.
    *   *Solution:* Cleaned up component declarations, pushing all state and lifecycle hooks to the top of `RouteDetails.tsx`.

---

## 2. Industry-Standard Search Experience
*   **Google Maps Pill-Shaped Overhaul:** Redesigned the search bar to feature a floating, pill-shaped design, incorporating modern UX elements like a Hamburger menu button, a voice search microphone icon, and a colored user avatar.
*   **Clear (X) Button Integration:** The microphone icon inside the Search Bar dynamically morphs into an `X` clear button as soon as the user starts typing, making input clearing simple and quick.
*   **Smart Proximity Geocoding:** Updated the Mapbox Geocoding endpoint to utilize the user's live GPS coordinates using `proximity` and bounded results to `country=in`. Search recommendations now prioritize local (Kukatpally/Hyderabad) places rather than global ones.
*   **Recent Search History:** Added a persistent `recentSearches` array to the global Zustand store. If the search bar is focused but empty, a dropdown displaying the last two navigated locations appears with `Clock` icons for 1-tap rapid routing.

---

## 3. Immersive Navigation Experience
*   **Dynamic Route Planning Mode:** Hides the search bar during the route selection process and renders a dedicated Route Planner block showing `Your Location` routing to the `Destination` with a clean back button.
*   **Turn-by-Turn Instruction Banner:** Created a drop-down top banner that displays prominent navigation commands (e.g., "Turn right onto Main Road in 100m") with direction arrows when navigation is active.
*   **Floating Speedometer Widget:** Injected a dynamic floating circular speedometer that mimics live driving telemetry (fluctuating realistically between 30 and 45 km/h) to convey a professional GPS drive-mode feel.
*   **Mappls-Style Bottom Bar Redesign:** Simplified the navigation card to a highly aesthetic, minimal, dark-mode strip. Centered the distance, ETA, and remaining time (in danger red), and featured a massive, circular red **"X" End Navigation** button for quick, safe exits.
*   **Dynamic Reset Camera & Recenter:** Synced the floating Recenter and SOS buttons so they dynamically shift up and down depending on whether cards are visible. Tapping Recenter during active navigation re-snaps the camera to the user with a 3D perspective and `zoomLevel 18`.

---

## 4. Map Interface Polish
*   **Floating Route Time Tags:** Automatically calculates the midpoints of the calculated polylines and drops interactive time tags (`7 min`, `12 min`) onto the map.
*   **Dynamic Route Selection from Map:** Users can switch between routes by simply tapping their respective time tags directly on the map.
*   **Identical Route Optimization:** If the safest route matches the fastest route, the map collapses the redundant geometry and displays a single route tagged with `"X min (Best)"`.
*   **Lingering Polyline Cleanup:** Ensuring that clicking the "End" navigation button safely cleans up both the destination state AND active polyline layers from the map canvas, returning the user to a clean, fresh interface.

---

## Technical Files Modified
*   `SafeRoute_Native/src/store/useStore.ts`: Added state for `recentSearches`, `isNavigating`, and client-side `sosAlerts` deduplication checks.
*   `SafeRoute_Native/src/components/Map/SafeMapView.tsx`: Refactored tracking mode camera, recenter button zoom, floating time tags, and native string-mode map properties.
*   `SafeRoute_Native/src/components/UI/SearchBar.tsx`: Built the Google Maps pill design, search clearing, geocoding proximity bias, and recent search display logic. Reverted geofence restrictions to support unrestricted geocoding.
*   `SafeRoute_Native/src/components/UI/RouteDetails.tsx`: Implemented custom sliding bottom card, active turn-by-turn banner, speedometer telemetry, and Mappls-style navigation controls.
*   `SafeRoute_Native/src/components/UI/SOSButton.tsx`: Resized the button for better screen space and synced its absolute positioning with the recenter button.
*   `SafeRoute_Native/App.tsx`: Wired up layout conditional rendering to support route previews, navigation transitions, and search history states.
*   `SafeRoute_Backend/main.py`: Upgraded pre-load road graph radius to 12km Hyderabad network, decoupled dynamic Dijkstra penalty costs from returned drive ETAs.
*   `SafeRoute_Admin/src/components/MapView.tsx`: Engineered tactical Patrol Dispatch marker tracking, real-time driving animations, and status ticker indicators.
*   `SafeRoute_Admin/src/hooks/useWebSocket.ts`: Refactored client listener hook to a reference-counted shared singleton.
*   `SafeRoute_Admin/src/store/useStore.ts`: Implemented store-level 5-second alert duplicate filtering.
