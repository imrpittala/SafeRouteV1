import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from src.dependencies import verify_firebase_token

# Override Firebase Auth dependency to return a mock UID during tests
app.dependency_overrides[verify_firebase_token] = lambda: "test_solo_dev_uid"

@pytest.mark.asyncio
async def test_null_island_rejection():
    """Test that the Pydantic validator rejects [0.0, 0.0] (Ocean Spawning bug)"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/hazards/", json={
            "hazard_type": "CRIME",
            "coordinates": [0.0, 0.0]
        })
    assert response.status_code == 422
    assert "rejected" in response.text

@pytest.mark.asyncio
async def test_precision_rejection():
    """Test that the Pydantic validator rejects imprecise coordinates"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/v1/hazards/", json={
            "hazard_type": "UNLIT",
            "coordinates": [78.0, 17.0]
        })
    assert response.status_code == 422
    assert "precision" in response.text

@pytest.mark.asyncio
async def test_create_and_fetch_hazard():
    """Test creating a valid hazard and fetching it via bounding box"""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Create a valid hazard in Hyderabad
        valid_lon, valid_lat = 78.3908, 17.4485
        create_res = await ac.post("/api/v1/hazards/", json={
            "hazard_type": "ROADBLOCK",
            "coordinates": [valid_lon, valid_lat]
        })
        assert create_res.status_code == 200
        data = create_res.json()
        assert data["hazard_type"] == "ROADBLOCK"

        # 2. Query with a Bounding Box surrounding Hyderabad
        fetch_res = await ac.get(
            f"/api/v1/hazards/nearby?min_lon={valid_lon-0.1}&min_lat={valid_lat-0.1}&max_lon={valid_lon+0.1}&max_lat={valid_lat+0.1}"
        )
        assert fetch_res.status_code == 200
        results = fetch_res.json()
        assert len(results) > 0
        assert any(h["hazard_type"] == "ROADBLOCK" for h in results)

        # 3. Query with a Bounding Box in New York (should return empty)
        ny_res = await ac.get("/api/v1/hazards/nearby?min_lon=-74.0&min_lat=40.0&max_lon=-73.0&max_lat=41.0")
        assert ny_res.status_code == 200
        ny_results = ny_res.json()
        
        # Verify the Hyderabad hazard did not spawn in New York
        assert not any(h["id"] == data["id"] for h in ny_results)
