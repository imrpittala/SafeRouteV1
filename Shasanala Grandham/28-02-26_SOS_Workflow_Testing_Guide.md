# Testing the SOS Workflow

Here is a step-by-step guide to testing the end-to-end flow of an SOS alert: from triggering it on the native app (simulated) to instantly receiving it on the admin dashboard (simulated).

## 1. Start the Backend Server
I noticed `uvicorn` wasn't recognized as a direct command on your system (it's not in your PATH). The easiest workaround is to run it as a python module.
Ensure you are in the `c:\SafeRoute\SafeRoute_Backend` directory and run:

```bash
python -m uvicorn main:app --reload
```
*(Note: I am already running this for you in the background!)*

## 2. Open the Admin Dashboard Simulator
To verify the admin dashboard receives the alerts, we need a WebSocket listener. I have created a file called `admin_test.html` in your backend folder.
1. Open your File Explorer.
2. Navigate to `c:\SafeRoute\SafeRoute_Backend`.
3. Double-click the `admin_test.html` file to open it in your browser.
4. You should see a message saying **"Connected to Server! Waiting for SOS alerts..."**

This page represents your React web dashboard keeping an open connection to `/ws/admin`.

## 3. Trigger the SOS Alert (Simulate the Mobile App)
Now, let's pretend a user presses the SOS button on their mobile app. The app would send a POST request with their location data to `/api/alerts/sos`.

Open a new PowerShell window and run this command:

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/alerts/sos" -Method Post -ContentType "application/json" -Body '{"userId": "user-4892", "location": {"lat": 12.9716, "lng": 77.5946}, "type": "SOS"}'
```

*(Alternatively, you can open another terminal tab inside VS Code and run it there).*

## 4. Observe the Real-time Update
Immediately after running that POST command:
1. Check the PowerShell window: You will see a `success` response from the server indicating the alert was broadcasted.
2. Check your browser where `admin_test.html` is open: You will instantly see the JSON payload appear on the screen!

```json
{"userId": "user-4892", "location": {"lat": 12.9716, "lng": 77.5946}, "timestamp": "2026-02-28T15:00:00.000000Z", "type": "SOS"}
```

This confirms the backend successfully received the REST API call from the "mobile app", processed it, and pushed it through the WebSocket to the listening "admin dashboard" in real-time.
