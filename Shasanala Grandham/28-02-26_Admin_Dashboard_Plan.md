# SafeRoute Admin Dashboard Implementation Plan

This implementation plan outlines the creation of the SafeRoute Admin dashboard, a React web application designed for city administrators to monitor live safety data, view user reports, and tune routing algorithms.

## User Review Required

> [!CAUTION]
> Please review the proposed technology stack and the specific libraries. I will wait for your explicit approval before executing this plan.
- **Framework:** React + Vite (TypeScript)
- **Styling:** Tailwind CSS (Dark-mode priority, professional SaaS aesthetic)
- **Map:** `react-leaflet` and standard `leaflet` (If you desire Google Maps or Mapbox instead, explicitly state so!).
- **Analytics:** `recharts` for visual representations of routing costs.
- **Icons:** `lucide-react`

## Proposed Changes

### Setup and Dependencies
- Create a new Vite React TypeScript project inside `c:\Users\P Raghavendra\Desktop\SafeRoute Admin`.
- Configure `tailwindcss` (with `postcss` and `autoprefixer`) and ensure the foundational index.css contains our dark-mode design system base.
- Add components dependencies.

### SafeRoute App Layout & Theming
- Build a generic responsive wrapper with modern SaaS styling (dark theme, glassmorphic hints).
- Provide a persistent navigation sidebar with "Live Map", "Incident Reports", and "Algorithm Tuning" tabs.
- Place three top-level KPI Analytics Cards above the map (Active Users, High-Risk Zones Identified, SOS Alerts Today).

### Live Map Sub-view
- Implement a massive main-screen map instance using `react-leaflet`.
- Use generic standard tile providers suitable for dark mode (e.g. CartoDB Dark Matter) representing the city.
- Display a mock heatmap. (Due to constraints in standard leaflet plugins for React, this might be approximated via translucent semi-overlapping colored circles for high risk "danger zones").
- Render 5 clickable point markers summarizing recent user-reported "Unsafe" locations.

### Algorithm Tuning Sub-view
- Expose a floating or sidebar-integrated control panel.
- Present a range-slider bound to a state variable (λ, lambda modifier: 0 to 5000).
- As λ is adjusted by the administrator, a Rechart line/bar visualisation beside the component will dynamically update representing the tradeoff calculation "Fast route vs Safe route".

## Verification Plan

### Automated Tests
- Automated rendering tests are out-of-scope for prototype MVP.

### Manual Verification
1. I will boot the Vite dev server.
2. An Antigravity Browser Sub-agent will navigate to `http://localhost:5173`.
3. Validations to perform via sub-agent:
   - Ensure the overarching layout isn't totally broken and responds to a dark-mode sleek design.
   - Verify the Map is properly drawing map-tiles.
   - Attempt to interact with one of the incident markers to trigger a popup overlay block.
   - Trigger adjustments to the Tuning Slider and ensure the UI doesn't crash, instead updating the React state smoothly.
4. Export screenshots and record a demonstrative browser clip. 
5. Construct and populate `<appDataDir>/brain/<conversation-id>/walkthrough.md`.
