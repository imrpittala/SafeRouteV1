# Backend Phase 2 Report

## Objectives Met
- Integrated `OSMnx` to download a street network graph and store it in memory on startup.
- Implemented strict memory management by downloading a small bounding box (500m radius) around a specific coordinate to avoid environment crashes.
- Integrated `redis.asyncio` client with initialization and teardown within the FastAPI lifespan.
- Created Redis geospatial functions: `add_active_sos` using `GEOADD` and `get_nearby_sos` using `GEORADIUS` with proper TTL handling via companion keys.
- Handled backwards compatibility and robust syntax for `geoadd` based on `redis-py` updates.

## API Updates
- The application now manages persistent connection pools to Redis.
- Added internal methods `add_active_sos` and `get_nearby_sos` that integrate seamlessly with the routing and SOS broadcast logic planned for the subsequent phases.

## Performance Metrics & Test Coverage
- Executed `pytest test_phase2.py -v` successfully.
- Tests confirm `osmnx` graph successfully populates global state during startup.
- Tests confirm Redis `GEOADD` and `GEORADIUS` function correctly, accurately resolving SOS locations within specific distance radii.
- Status: **PASSED**
