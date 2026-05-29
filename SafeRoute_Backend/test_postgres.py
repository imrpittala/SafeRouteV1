"""
test_postgres.py — Milestone 2 Unit Tests

Tests for PostgreSQL integration, heatmap GeoJSON endpoint structure,
and hybrid alert archiving. Uses monkeypatching to isolate from real DB.
"""
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient


def test_heatmap_returns_503_when_no_db():
    """When db_pool is None, /api/analytics/heatmap should return 503."""
    import main
    with patch.object(main, 'init_db_pool', new_callable=AsyncMock, return_value=None):
        with TestClient(main.app) as client:
            res = client.get("/api/analytics/heatmap")
            assert res.status_code == 503
            data = res.json()
            assert "error" in data
            assert "PostgreSQL" in data["error"]


def test_healthcheck_includes_postgres_field():
    """The /system/health endpoint must always include 'postgres_connected'."""
    import main
    with patch.object(main, 'init_db_pool', new_callable=AsyncMock, return_value=None):
        with TestClient(main.app) as client:
            res = client.get("/system/health")
            assert res.status_code == 200
            data = res.json()
            assert "postgres_connected" in data
            assert data["postgres_connected"] is False
            assert "redis_connected" in data


def test_heatmap_geojson_structure():
    """
    When the heatmap endpoint returns data, it must be a valid
    GeoJSON FeatureCollection with the correct top-level keys.
    """
    mock_geojson = json.dumps({
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [78.4026, 17.4849]
                },
                "properties": {
                    "id": 1,
                    "user_id": "test-user",
                    "latitude": 17.4849,
                    "longitude": 78.4026,
                    "created_at": "2026-05-29T12:00:00+00:00",
                    "resolved_at": None,
                    "exposure_level": "unknown"
                }
            }
        ]
    })

    # Create a mock connection that returns our test GeoJSON
    mock_conn = AsyncMock()
    mock_conn.fetchval = AsyncMock(return_value=mock_geojson)
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_pool = MagicMock()
    mock_pool.acquire = MagicMock(return_value=mock_conn)
    mock_pool.close = AsyncMock()  # Lifespan shutdown awaits pool.close()

    import main
    # Patch init_db_pool to avoid 5-retry wait during tests
    with patch.object(main, 'init_db_pool', new_callable=AsyncMock, return_value=None):
        with TestClient(main.app) as client:
            # Set mock pool AFTER lifespan has run (which resets db_pool to None)
            main.db_pool = mock_pool
            res = client.get("/api/analytics/heatmap")
            assert res.status_code == 200
            data = res.json()
            
            # Validate GeoJSON structure
            assert data["type"] == "FeatureCollection"
            assert "features" in data
            assert isinstance(data["features"], list)
            assert len(data["features"]) == 1
            
            feature = data["features"][0]
            assert feature["type"] == "Feature"
            assert feature["geometry"]["type"] == "Point"
            assert feature["geometry"]["coordinates"] == [78.4026, 17.4849]
            assert feature["properties"]["user_id"] == "test-user"
            assert feature["properties"]["latitude"] == 17.4849


def test_heatmap_empty_table():
    """When the incidents table is empty, return a valid FeatureCollection with empty features."""
    mock_geojson = json.dumps({
        "type": "FeatureCollection",
        "features": []
    })

    mock_conn = AsyncMock()
    mock_conn.fetchval = AsyncMock(return_value=mock_geojson)
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_pool = MagicMock()
    mock_pool.acquire = MagicMock(return_value=mock_conn)
    mock_pool.close = AsyncMock()  # Lifespan shutdown awaits pool.close()

    import main
    with patch.object(main, 'init_db_pool', new_callable=AsyncMock, return_value=None):
        with TestClient(main.app) as client:
            main.db_pool = mock_pool
            res = client.get("/api/analytics/heatmap")
            assert res.status_code == 200
            data = res.json()
            assert data["type"] == "FeatureCollection"
            assert data["features"] == []


@pytest.mark.asyncio
async def test_add_active_sos_writes_to_postgres():
    """Verify that add_active_sos calls PostgreSQL INSERT when db_pool is set."""
    mock_conn = AsyncMock()
    mock_conn.execute = AsyncMock()
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_pool = MagicMock()
    mock_pool.acquire = MagicMock(return_value=mock_conn)

    import main
    original_pool = main.db_pool
    original_redis = main.redis_client
    main.db_pool = mock_pool
    main.redis_client = None  # Isolate from Redis
    try:
        await main.add_active_sos("test-pg-user", 17.4849, 78.4026)
        
        # Verify the RAM cache was updated
        assert "test-pg-user" in main.MEM_SOS_ALERTS
        assert main.MEM_SOS_ALERTS["test-pg-user"]["lat"] == 17.4849
        
        # Verify PostgreSQL INSERT was called
        mock_conn.execute.assert_called_once()
        call_args = mock_conn.execute.call_args
        assert "INSERT INTO sos_incidents" in call_args[0][0]
        assert call_args[0][1] == "test-pg-user"
        assert call_args[0][2] == 17.4849
        assert call_args[0][3] == 78.4026
    finally:
        main.db_pool = original_pool
        main.redis_client = original_redis
        if "test-pg-user" in main.MEM_SOS_ALERTS:
            del main.MEM_SOS_ALERTS["test-pg-user"]


@pytest.mark.asyncio
async def test_add_active_sos_survives_pg_failure():
    """If PostgreSQL raises an exception, the alert must still be saved in RAM."""
    mock_conn = AsyncMock()
    mock_conn.execute = AsyncMock(side_effect=Exception("DB connection lost"))
    mock_conn.__aenter__ = AsyncMock(return_value=mock_conn)
    mock_conn.__aexit__ = AsyncMock(return_value=None)

    mock_pool = MagicMock()
    mock_pool.acquire = MagicMock(return_value=mock_conn)

    import main
    original_pool = main.db_pool
    original_redis = main.redis_client
    main.db_pool = mock_pool
    main.redis_client = None
    try:
        # This should NOT raise — it must degrade gracefully
        await main.add_active_sos("resilient-user", 17.50, 78.40)
        
        # RAM cache must still have the alert
        assert "resilient-user" in main.MEM_SOS_ALERTS
        assert main.MEM_SOS_ALERTS["resilient-user"]["lat"] == 17.50
    finally:
        main.db_pool = original_pool
        main.redis_client = original_redis
        if "resilient-user" in main.MEM_SOS_ALERTS:
            del main.MEM_SOS_ALERTS["resilient-user"]
