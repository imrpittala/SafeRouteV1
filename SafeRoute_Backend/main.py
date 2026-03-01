import json
from datetime import datetime
from typing import List, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Initialize FastAPI App
app = FastAPI(title="SafeRoute Backend", description="Real-time SOS alerting for SafeRoute.")

# 1. CORS Configuration
# We need to allow the React Admin dashboard (running on localhost or Vercel) to hit this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development. In prod, lock this down.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 2. Data Models (Pydantic)
# These models validate the incoming JSON from the mobile app's POST request.
class Location(BaseModel):
    lat: float
    lng: float


class SOSAlert(BaseModel):
    userId: str
    location: Location
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    type: str = "SOS"


# 3. Connection Manager
# Manages active WebSocket connections from the admin dashboards
class ConnectionManager:
    def __init__(self):
        # Store a list of active WebSocket connections
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accepts a new WebSocket connection and adds it to the active list."""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Removes a WebSocket connection from the active list."""
        self.active_connections.remove(websocket)
        print(f"Client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """
        Broadcasts a JSON message to all currently connected WebSockets.
        This handles the instant communication to the admin dashboards.
        """
        for connection in self.active_connections:
            try:
                # Send the dictionary as a JSON string over the WebSocket
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"Error broadcasting to client: {e}")


# Initialize the connection manager
manager = ConnectionManager()


# 4. REST API Endpoint (Mobile Trigger)
# The React Native app performs a POST request here when the SOS button is pressed.
@app.post("/api/alerts/sos")
async def trigger_sos_alert(alert: SOSAlert):
    """
    Receives an SOS alert from the mobile app and immediately broadcasts it 
    to all connected admin web dashboards via WebSockets.
    """
    
    # The 'alert' parameter is automatically validated by Pydantic based on the SOSAlert schema
    alert_dict = alert.model_dump()
    print(f"Received SOS from User {alert.userId} at {alert.location.lat}, {alert.location.lng}")
    
    # Broadcast the validated alert data to all listening WebSockets
    await manager.broadcast(alert_dict)
    
    # Return success response to the mobile app
    return {"status": "success", "message": "Alert broadcasted successfully", "data": alert_dict}


# 5. WebSocket Endpoint (Admin Listener)
# The React Admin dashboard connects to this endpoint and stays connected.
@app.websocket("/ws/admin")
async def websocket_endpoint(websocket: WebSocket):
    """
    Handles WebSocket connections from admin dashboards.
    Keeps the connection open to push SOS alerts as they arrive.
    """
    await manager.connect(websocket)
    try:
        # Keep the connection open indefinitely, waiting for incoming messages 
        # (Though in our case, the admin mostly just listens, but we still need 
        # a receive loop to keep the socket alive and handle client disconnects).
        while True:
            # We don't expect the admin panel to send us messages for this feature,
            # but we wait for receive_text to detect if the client disconnects.
            data = await websocket.receive_text()
            print(f"Received unexpected message from admin client: {data}")
    except WebSocketDisconnect:
        # If the client closes the connection (e.g., closing the tab), remove them
        manager.disconnect(websocket)
