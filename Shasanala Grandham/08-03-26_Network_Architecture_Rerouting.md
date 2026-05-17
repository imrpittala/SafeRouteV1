# SafeRoute Network Architecture & Rerouting Walkthrough

Welcome! As you transition your SafeRoute applications (Vite Admin and Expo Native) to recognize your new backend IP `192.168.0.118`, it's an excellent opportunity to solidify your understanding of frontend-backend communication. 

---

## 1. The Walkthrough: Network Routing in a Standard Architecture

When building a full-stack application, the frontend (clients) must always know exactly *where* the backend (server) lives on the network. In a local development environment, this "where" is usually your computer's local Wi-Fi IP address.

### Which files handle network routing and why?
In a well-architected frontend (like what you are building with `SafeRoute`), you want to isolate your network logic rather than hardcoding IP addresses directly into every UI component. Here is the standard structure:

*   **`services/api.ts` (REST API configuration)**
    *   **Role**: This acts as the central router for all standard HTTP/REST requests (like fetching a list of users, or sending an administrative configuration command).
    *   **Why it needs the IP**: It sets up a global `Axios` or `Fetch` instance configured with a `BASE_URL`. By pointing this base URL to `http://192.168.0.118:8000`, every endpoint call (e.g., `/api/users/1`) automatically routes to that IP. If your IP changes again, you only edit this one file.
*   **`hooks/useSOSWebSocket.ts` (Real-time WebSockets)**
    *   **Role**: This file manages the persistent, real-time connection necessary for live map tracking and instantaneous SOS alerts. WebSockets use a different protocol (`ws://` instead of `http://`).
    *   **Why it needs the IP**: Just like HTTP calls, the WebSocket client needs an exact URI (e.g., `ws://192.168.0.118:8000/ws/admin`) to establish the two-way pipeline.
*   **Components (e.g., `SOSButton.tsx`)**
    *   **Role**: Components are responsible for the User Interface. They should ideally **not** contain hardcoded network IPs. They simply call the isolated functions from your `services/` and `hooks/`.

---

## 2. The API Service Update (`services/api.ts`)

Here is the updated code for your central API service. This utilizes `axios` to define a single `BASE_URL`.

```typescript
import axios from 'axios';

// Update this to your NEW local machine IP on the Wi-Fi network
const NEW_BACKEND_IP = '192.168.0.118';
const BASE_URL = `http://${NEW_BACKEND_IP}:8000/api`;

// Create a globally configured Axios instance
export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

// Example centralized service functions
export const SOSService = {
    // This will hit http://192.168.0.118:8000/api/alerts/sos
    triggerAlert: (payload: any) => api.post('/alerts/sos', payload),
    getActiveAlerts: () => api.get('/alerts/active'),
};
```

*(Note: Depending on how your components are currently importing the `axios` instance, you can simply export `api` and use `api.post(...)` across your application).*

---

## 3. The WebSocket Update (`hooks/useSOSWebSocket.ts`)

WebSockets rely on the `ws://` protocol. Here is how your updated custom React hook should look to connect to your new backend instance:

```typescript
import { useState, useEffect, useRef } from 'react';

const NEW_BACKEND_IP = '192.168.0.118';
// Notice the 'ws://' protocol instead of 'http://'
const WS_URL = `ws://${NEW_BACKEND_IP}:8000/ws`;

export const useSOSWebSocket = (endpoint: string = '/admin') => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Construct the full WebSocket URI using the new IP
        const fullWsUrl = `${WS_URL}${endpoint}`;
        
        console.log(`Attempting WebSocket connection to: ${fullWsUrl}`);
        const ws = new WebSocket(fullWsUrl);

        ws.onopen = () => {
            console.log('WebSocket Connected successfully to', fullWsUrl);
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLastMessage(data);
        };

        ws.onclose = () => {
            console.log('WebSocket Disconnected');
            setIsConnected(false);
        };

        wsRef.current = ws;

        // Cleanup function for when the component unmounts
        return () => {
            ws.close();
            wsRef.current = null;
        };
    }, [endpoint]);

    // Expose a helper method to send messages (if needed)
    const sendMessage = (msg: any) => {
        if (wsRef.current && isConnected) {
            wsRef.current.send(JSON.stringify(msg));
        }
    };

    return { isConnected, lastMessage, sendMessage };
};
```

---

## 4. The Component Audit: Finding Hardcoded IPs

If you started out by hardcoding IPs directly into your UI components (such as `SOSButton.tsx`), you will have broken links. Here is how to expertly audit your VS Code workspace:

### VS Code Global Search Steps:

1. **Open the Global Search Panel**:
   *   **Windows/Linux**: Press `Ctrl + Shift + F`
   *   **Mac**: Press `Cmd + Shift + F`
   *(Alternatively, click the magnifying glass icon on the far left sidebar in VS Code).*

2. **Search for the Old Network Identifiers**:
   Enter each of the following terms into the search bar, one by one, to catch all culprits:
   *   `192.168.` (This will catch your old `192.168.50.17` value)
   *   `localhost`
   *   `http://127.0.0.1`

3. **What You Need to Replace**:
   Click on the search results to open the offending files. You will likely find code acting like this:
   ```typescript
   // Inside a component
   const BACKEND_URL = 'http://192.168.50.17:8000/api/alerts/sos';
   ```
   **To fix this properly**, instead of replacing the IP right there, delete that line and **import your new centralized API service**:
   ```typescript
   import { SOSService } from '../services/api';
   // ... later in the code
   await SOSService.triggerAlert(payload);
   ```

> [!TIP]
> **Proactive Insight:** I ran a quick scan of your workspace while auditing and found that `SafeRoute_Native/src/components/SOSButton.tsx` (Line 10) currently has `const BACKEND_URL = 'http://192.168.50.17:8000/api/alerts/sos';` hardcoded into it! 
> 
> Furthermore, in `SafeRoute_Backend/main.py`, you have CORS origins hardcoded to `http://192.168.50.17:5173`. Make sure to update your FastAPI CORS configuration to include `"http://192.168.0.118:5173"` so your Vite Admin dashboard is allowed to communicate with the backend!

Happy Routing! Let me know if you would like me to proactively update `SOSButton.tsx` and your `main.py` CORS settings for you right now using the new architecture.
