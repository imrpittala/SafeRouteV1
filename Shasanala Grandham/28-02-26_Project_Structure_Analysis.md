# SafeRoute Project Structure Analysis

The `c:\SafeRoute` directory contains two main projects:

## 1. SafeRoute_Admin
This is a React web dashboard built with Vite, TypeScript, and Tailwind CSS. It appears to be an admin dashboard for SafeRoute.

**Key Directories and Files:**
- `src/`: The main source code directory.
  - `components/`: Contains UI components like `AnalyticsCards.tsx`, `Layout.tsx`, `MapView.tsx`, `Sidebar.tsx`, and `TuningPanel.tsx`.
  - `App.tsx` and `main.tsx`: The main entry points for the React application.
  - `index.css` and `App.css`: Global styles.
  - `assets/`: Static assets like images or fonts.
- `public/`: Public static files served as-is by Vite.
- `index.html`: The HTML template for the web app.
- Configuration Files: Includes `vite.config.ts` for build tools, `tailwind.config.js`/`postcss.config.js` for styling, and `tsconfig.json` files for TypeScript.

## 2. SafeRoute_Native
This is a React Native mobile application built with the Expo framework and TypeScript. It appears to be the client-facing mobile app for SafeRoute.

**Key Directories and Files:**
- `src/`: The main source code directory containing subdirectories for better organization.
  - `components/`: UI components such as `BottomControls.tsx`, `MapScreen.tsx`, and `SOSButton.tsx`.
  - `store/`: State management (likely Redux, Zustand, or Context API).
  - `utils/`: Helper functions and utilities.
- `App.tsx`: The main entry point for the Expo mobile app.
- Configuration Files: Contains Expo-specific configs like `app.json`, `babel.config.js` for compilation, and `tsconfig.json` for TypeScript setup.

---
**Summary:**
The repository operates as a monorepo setup containing both a web-based admin dashboard and a cross-platform mobile app, both utilizing TypeScript and modern React ecosystem tools.
