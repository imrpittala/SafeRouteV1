import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_routes_contract():
    response = client.get("/routes?start_lat=17.3753&start_lng=78.4744&end_lat=17.3800&end_lng=78.4800")
    assert response.status_code == 200
    data = response.json()
    assert "fastest_route" in data
    assert "safest_route" in data
    assert data["fastest_route"]["type"] == "Feature"
    assert data["safest_route"]["type"] == "Feature"

def test_websocket_sos():
    with client.websocket_connect("/ws/sos") as websocket:
        payload = {
            "userId": "test_user",
            "location": {"lat": 17.3753, "lng": 78.4744},
            "timestamp": "2024-02-28T12:00:00Z",
            "type": "SOS"
        }
        websocket.send_json(payload)
        response = websocket.receive_json()
        assert response["userId"] == "test_user"
        assert response["type"] == "SOS"
