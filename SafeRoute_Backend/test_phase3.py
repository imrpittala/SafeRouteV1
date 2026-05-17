import pytest
from fastapi.testclient import TestClient
import main
from main import app, add_active_sos
import fakeredis.aioredis

@pytest.fixture
def mock_redis(monkeypatch):
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(main, "redis_client", fake_redis)
    return fake_redis

@pytest.mark.asyncio
async def test_dual_weight_routing(mock_redis):
    with TestClient(app) as client:
        # Check if graph is initialized
        assert main.G is not None
        assert len(main.G.nodes) > 0
        
        # get two nodes to route between
        nodes = list(main.G.nodes(data=True))
        start_node = nodes[0]
        end_node = nodes[10] # some other node
        
        start_lat, start_lng = start_node[1]['y'], start_node[1]['x']
        end_lat, end_lng = end_node[1]['y'], end_node[1]['x']
        
        # Test routing WITHOUT SOS alerts
        res = client.get(f"/routes?start_lat={start_lat}&start_lng={start_lng}&end_lat={end_lat}&end_lng={end_lng}")
        assert res.status_code == 200
        data = res.json()
        assert "fastest_route" in data
        assert "safest_route" in data
        
        # Initially, safest weight should equal fastest weight
        w_fast = data["fastest_route"]["properties"]["weight"]
        w_safe = data["safest_route"]["properties"]["weight"]
        assert abs(w_fast - w_safe) < 0.001
        
        # Now add an SOS alert at the start node to trigger penalty
        await add_active_sos("sos_1", start_lat, start_lng)
        
        # Re-run routing
        res2 = client.get(f"/routes?start_lat={start_lat}&start_lng={start_lng}&end_lat={end_lat}&end_lng={end_lng}")
        data2 = res2.json()
        
        w_fast_new = data2["fastest_route"]["properties"]["weight"]
        w_safe_new = data2["safest_route"]["properties"]["weight"]
        
        # Safest route should now have a much higher weight due to the +1000 penalty 
        # or find a different path
        assert w_safe_new > w_fast_new + 900
