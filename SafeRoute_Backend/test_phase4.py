import pytest
from fastapi.testclient import TestClient
import main
from main import app
import fakeredis.aioredis
import json
import asyncio

@pytest.fixture
def mock_redis(monkeypatch):
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    # Ensure main.redis_client is the mock before lifespan runs
    monkeypatch.setattr(main, "redis_client", fake_redis)
    return fake_redis

def test_websocket_sos_broadcast_and_redis_update(mock_redis):
    with TestClient(app) as client:
        with client.websocket_connect("/ws/sos") as websocket:
            payload = {
                "userId": "test_user_456",
                "location": {"lat": 37.7749, "lng": -122.4194},
                "type": "SOS"
            }
            websocket.send_text(json.dumps(payload))
            
            # Check broadcast
            data = websocket.receive_json()
            assert data["userId"] == "test_user_456"
            
            # Check Redis update
            async def check_redis():
                members = await mock_redis.georadius("sos_alerts", -122.4194, 37.7749, 1, unit='km')
                return "test_user_456" in [m for m in members]
                
            is_in_redis = asyncio.run(check_redis())
            assert is_in_redis is True
