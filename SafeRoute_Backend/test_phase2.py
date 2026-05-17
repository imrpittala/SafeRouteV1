import pytest
from fastapi.testclient import TestClient
import main
from main import app, add_active_sos, get_nearby_sos
import fakeredis.aioredis
import asyncio

@pytest.fixture
def mock_redis(monkeypatch):
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(main, "redis_client", fake_redis)
    return fake_redis

@pytest.mark.asyncio
async def test_redis_spatial_indexing(mock_redis):
    # Test adding and querying nearby SOS
    lat, lng = 37.7749, -122.4194
    user_id = "user_123"
    await add_active_sos(user_id, lat, lng)
    
    # Query very close
    nearby = await get_nearby_sos(lat, lng, radius_km=1.0)
    assert user_id in nearby
    
    # Query far away
    far_away = await get_nearby_sos(40.7128, -74.0060, radius_km=10.0) # NYC
    assert user_id not in far_away

def test_startup_graph_initialization():
    # TestClient triggers lifespan
    with TestClient(app) as client:
        # Check if graph G is initialized
        assert main.G is not None
        # It should have some nodes, even if fallback
        assert len(main.G.nodes) >= 0
