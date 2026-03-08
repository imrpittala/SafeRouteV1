# 🏗️ SafeRoute Master Architecture & Project Report



**Project Goal:** To build a resilient, full-stack emergency response and navigation system capable of operating in unstable network environments. SafeRoute instantly broadcasts SOS alerts, calculates route safety scores using AI, and provides a real-time command center for monitoring.

## 🧱 The Tri-Stack Foundation

1. **The Client (React Native / Expo SDK 55):** The user-facing mobile app. Built with an offline-first philosophy using `AsyncStorage` and `NetInfo`.
2. **The Brain (Python / FastAPI):** The central nervous system. It processes incoming SOS payloads, handles cross-origin requests (CORS), and houses the AI route-scoring ML models. 
3. **The Command Center (React / Vite):** The admin web dashboard designed to visualize emergency alerts and map data in real-time.

---

## 🏆 Current Phase: Pre-Alpha Local Integration

The system is currently operating in a cross-device Local Area Network (LAN) testing phase. The three distinct tech stacks are successfully communicating over a dedicated mobile hotspot.

### Key Milestones Achieved:
* **The Offline-First Queue:** Built a robust SOS button that instantly fires to the server when online, but securely caches the payload to the device's local memory if the network fails. It auto-syncs the moment connectivity returns.
* **Network Independence:** Successfully bypassed restrictive college Wi-Fi firewalls (Client Isolation) by establishing a dedicated, over-the-air Local Area Network.
* **Bleeding-Edge Mobile Engine:** Upgraded the React Native app from legacy SDK 49 to modern Expo SDK 55, migrating to the new Fabric rendering architecture.
* **Full-Stack Communication:** Wired the mobile app, the Python backend, and the Vite React dashboard together so an SOS triggered on the phone successfully appears on the web browser.
* **Clean Version Control:** Sanitized a corrupted Git repository and established a clean `main` branch as the ultimate source of truth.

---

## ⚔️ Battles Fought & Won (Technical Challenges)

1. **The AP Isolation Blockade:**
   * *Problem:* Local college Wi-Fi had "Client Isolation" active, blocking devices on the same network from seeing each other.
   * *Solution:* Bypassed the router using a local mobile hotspot and utilized PowerShell environment variables (`$env:REACT_NATIVE_PACKAGER_HOSTNAME`) to force the Metro bundler to bind directly to the LAN IP.
2. **The Invisible Map Bug (SDK 55 Fabric Engine):**
   * *Problem:* After upgrading to SDK 55, `react-native-maps` vanished into a blank screen.
   * *Solution:* Identified that SDK 55's new "Fabric" engine is ruthlessly strict about UI dimensions. Wrapped the `<MapView>` in a strict parent `<View>` and enforced `flex: 1` and `width/height: 100%` to prevent the engine from collapsing it to 0 pixels.
3. **Dashboard Deafness (CORS & IP Routing):**
   * *Problem:* The Python server received the SOS, but the Vite admin dashboard remained silent.
   * *Solution:* Updated Vite's fetch URLs to target the hotspot IP instead of `localhost` and injected a `CORSMiddleware` block into FastAPI to explicitly whitelist the dashboard's port.

---

## 🚧 Roadmap & Next Steps

1. **AI Logic Integration:** Wire `route_scoring_engine.py` into the FastAPI backend so the mobile app can request and display safety scores.
2. **Dynamic Dashboard Maps:** Configure the Vite web map's default center coordinates to target the primary testing zone (Hyderabad/Bangalore) instead of the library default (New York).
3. **Live GPS Integration:** Replace hardcoded SOS coordinates with live hardware GPS data via `expo-location`.
4. **The Alpha Build (EAS):** Bypass the Expo Go sandbox and use Expo Application Services to compile the code into a physical Android `.apk` file for native real-world testing.
5. **Cloud Deployment:** Migrate the FastAPI backend and Vite dashboard from local hosting to production cloud servers (e.g., AWS, Render, Vercel).

---

## 🔮 Future Risks & Mitigations

* **The Hardcoded IP Risk:** Backend URLs are currently hardcoded for local testing. 
  * *Defense:* Implement `.env` files across all three stacks to dynamically switch between local LAN IPs and production cloud URLs before deployment.
* **AI Processing Bottlenecks:** Complex route scoring could cause mobile "Network Timeout" errors if the API takes too long to respond.
  * *Defense:* Configure FastAPI to run the scoring engine as a `Background Task` or implement Redis/in-memory caching for frequently requested routes.
* **Native Android Gradle Failures:** Expo SDK 55 is incredibly strict about native dependency clashes during the EAS build process.
  * *Defense:* Rigorously audit `app.json` before building to ensure the `android.package` string is set and Google Maps API keys are securely injected using `expo-build-properties`.
