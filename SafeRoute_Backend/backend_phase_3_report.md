# Backend Phase 3 Report

## Objectives Met
- Implemented a custom Dijkstra pathfinding function `custom_dijkstra` that accepts dynamic weight functions.
- Implemented `fastest_weight` which calculates path weight purely on `distance / speed_limit`.
- Implemented `safest_weight` which uses a factory function to dynamically check if an edge is within a 500m radius of any active SOS alerts fetched from Redis. It applies a +1000 penalty to such edges.
- Integrated these into the `GET /routes` endpoint returning the GeoJSON LineStrings as per the Phase 1 contract.

## API Updates
- `GET /routes` now processes actual routing instead of returning a dummy response. It correctly returns `fastest_route` and `safest_route` incorporating the A* / Dijkstra evaluation of the in-memory graph.
- Implemented caching/pre-fetching of nearby SOS alerts at the beginning of the route request to dramatically improve execution time and event-loop performance.

## Performance Metrics & Test Coverage
- Executed `pytest test_phase3.py -v` successfully.
- Tests confirm that without SOS alerts, the safest and fastest route weights are identical.
- Tests confirm that adding an SOS alert near the path correctly triggers the +1000 penalty, diverging the safest route's logic or significantly increasing its total weight.
- Status: **PASSED**
