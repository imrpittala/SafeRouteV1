# 🔍 Detailed Role Guide: Aishwarya
**Title:** QA & Staging Engineer  
**Primary Goal:** To be the "Human Firewall." No code goes to the real-world users or the main GitHub branch unless Aishwarya proves it can survive unstable networks and edge cases.

## 1. Where to Start (The First 48 Hours)
Aishwarya should begin by mapping the exact current state of the SafeRoute network architecture. Before she can break it, she needs to understand how the three stacks talk to each other over the hotspot.

* **Action:** Connect to the test device hotspot and open the FastAPI auto-generated documentation at `http://192.168.50.17:8000/docs`. 
* **The Codebase Audit:** Have her explore the `tests/` folder you already built in the backend (specifically `test_main.py`, `test_familiarity_module.py`, and `test_privacy_compliance.py`).
* **The Setup:** Her "Staging" environment right now is the physical Android device running the Expo Go app connected to the local LAN, alongside the Vite Admin Dashboard running on `localhost:5173`.

## 2. What to Do (The Core Tasks)
Aishwarya’s work is divided into testing the "Brain" (Backend) and the "Nerves" (Network/Mobile).

### A. Automated Backend Testing (The "Brain")
She will take ownership of the Python `pytest` suite to ensure the AI logic and emergency routes never fail.
* **Task:** Expand the existing `tests/` folder.
* **Logic:** Write tests for the "Happy Path" (e.g., Does the server return a 200 OK when a valid SOS payload hits `/api/alerts/sos`?) and the "Sad Path" (e.g., How does the server react if the AI `route_scoring_engine.py` receives coordinates that don't exist?).
* **Focus Areas for SafeRoute:** * Ensure the AI module returns safety scores within an acceptable time limit (so it doesn't cause mobile network timeouts).
  * Validate that CORS middleware strictly allows only the Vite dashboard to read the data.

### B. The Offline-First Mobile Testing (The "Nerves")
* **Task:** Actively attempt to break the React Native network sync.
* **Logic:** She must act as a student in a dead-zone. Her primary job is to physically turn off the Android phone's Wi-Fi, trigger the 3-second SOS countdown, ensure `AsyncStorage` caches the alert, and then turn the Wi-Fi back on to verify the background sync successfully fires the payload to the dashboard.
* **UI/UX Checks:** Verify that the Google Map renders correctly under the strict SDK 55 Fabric engine rules, and that haptic vibrations fire exactly when the SOS is triggered.

## 3. How to Verify Her Work (The "Definition of Done")
How do you, as the Lead Developer, know she’s doing it right?

* **The Test Report:** She should be able to run `pytest --cov` in the `backend/` directory and show you a Coverage Report. If it says 80% or higher, the AI and API are highly stable.
* **Bug Reports:** When she finds a bug, she must create a GitHub Issue detailing:
  * **Environment:** e.g., "Android Native, Expo SDK 55, Hotspot IP."
  * **Steps to reproduce:** e.g., "1. Disconnect Wi-Fi. 2. Hit SOS. 3. Reconnect Wi-Fi. 4. Check Vite dashboard."
  * **Expected vs. Actual:** e.g., "Expected: Dashboard shows SOS. Actual: Payload dropped during sync."
  * **Logs:** FastAPI terminal errors or Metro bundler red screens.

## 4. Future Development (Her Growth Path)
As SafeRoute moves from local LAN testing to real Cloud Deployment, her role will level up:

* **Load Testing (Locust):** Simulating a campus-wide emergency where 500 students hit the SOS button at the exact same time. Does the FastAPI server queue them properly, or does the database crash?
* **Chaos Engineering:** Simulating mid-request network drops to see if the React Native app gracefully handles a connection dying *exactly* while it's waiting for an AI route safety score.
* 
