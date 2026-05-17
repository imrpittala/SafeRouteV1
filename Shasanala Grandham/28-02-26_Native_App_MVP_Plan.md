# Antigravity App - MVP Implementation Plan

This document outlines the proposed approach for scaffolding the Antigravity App MVP, a women's safety navigation application built with React Native and Expo.

## User Review Required

> [!CAUTION]
> Please review this plan and approve it before I execute the commands to generate the code. Since this application requires native modules (specifically `react-native-maps`), you'll need to run this using an Expo development build or Expo Go on a physical device/simulator.

The code will be scaffolded within your existing workspace directory: `c:/Users/P Raghavendra/Desktop/SafeRoute Native`.

## Proposed Changes

### Project Initialization
- Initialize a blank TypeScript Expo template in the workspace directory (or overwrite if empty).
- Install required dependencies: `react-native-maps` and `zustand`.

### State Management
#### [NEW] `src/store/useAppStore.ts`
- Create a Zustand store to manage:
  - `activeRoute`: `'fastest'` | `'safest'`
  - `isSOSActive`: `boolean`
  - Actions to toggle the route and trigger/cancel the SOS state.

### Map & Routes
#### [NEW] `src/components/MapScreen.tsx`
- **Map:** Use `MapView` from `react-native-maps` centered on a central mock location (e.g., a downtown city area).
- **Heatmap:** Add a `Heatmap` child component containing 20 mock coordinate points with varying weights representing high-risk areas.
- **Routes:** 
  - Define static mock coordinate arrays for "Fastest" and "Safest" routes.
  - Render `Polyline` components conditionally. The "Fastest" route will be a direct path (blue), while the "Safest" route will be slightly longer, explicitly detouring around the defined heatmap points (green).

### Overlays & Floating UI
#### [NEW] `src/components/BottomControls.tsx`
- A floating card positioned at the bottom of the screen.
- Contains two stylized buttons: "Fastest Route" and "Safest Route", connected to the Zustand store to toggle the `activeRoute`.

#### [NEW] `src/components/SOSButton.tsx`
- A prominent floating red circular SOS button positioned on the main screen.
- On press: Triggers `Vibration.vibrate()`, shows a 3-second countdown overlay UI.
- On countdown complete: Shows a React Native `Alert` stating "Emergency Contacts Notified".

### App Entry
#### [MODIFY] `App.tsx`
- Assemble `MapScreen`, `BottomControls`, and `SOSButton` into the main application.
- Apply appropriate React Native `<View>` styles to ensure absolute positioning overlay works correctly over the full-screen map.

## Verification Plan

### Manual Verification
- Once the code is implemented, I will generate a `walkthrough.md` artifact.
- The Walkthrough will contain explicit instructions on how to start the app (`npx expo start`) and preview it on your local iOS Simulator or Android Emulator, as the internal previewer does not support native module mapping.
- You can manually verify the route toggles, the heatmap rendering, and the SOS button countdown behavior.
