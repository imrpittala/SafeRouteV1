import asyncio
import httpx
import websockets
import json

async def test_backend():
    print("Testing Backend...")
    # 1. Test WebSocket Connection
    async with websockets.connect("ws://127.0.0.1:8000/ws/admin") as websocket:
        print("Connected to WebSocket /ws/admin")
        
        # 2. Fire an alert to the REST API
        print("Sending SOS Alert to REST API...")
        payload = {
            "userId": "test-user-123",
            "location": {"lat": 37.7749, "lng": -122.4194},
            "timestamp": "2026-03-01T12:00:00Z",
            "type": "SOS"
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post("http://127.0.0.1:8000/api/alerts/sos", json=payload)
            print(f"REST POST Status: {resp.status_code}")
            if resp.status_code != 200:
                print(f"Failed to post alert: {resp.text}")
                return False
                
        # 3. Verify WebSocket received the alert
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
            data = json.loads(message)
            print(f"WebSocket Received: {data}")
            if data.get("userId") == "test-user-123":
                print("E2E Test PASSED!")
                return True
        except asyncio.TimeoutError:
            print("WebSocket did not receive message in time.")
            return False

if __name__ == "__main__":
    asyncio.run(test_backend())
