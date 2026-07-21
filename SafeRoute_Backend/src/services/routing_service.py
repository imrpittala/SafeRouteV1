import os
import httpx
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.functions import ST_MakeEnvelope

from src.models.hazards import CrowdsourcedHazard

# Allowing Valhalla URL to be configured via ENV, defaulting to localhost:8002
VALHALLA_URL = os.getenv("VALHALLA_URL", "http://localhost:8002/route")

async def get_safe_route(db: AsyncSession, origin: tuple[float, float], destination: tuple[float, float], costing: str = "auto"):
    """
    Core algorithmic middleware. Intercepts route request, fetches spatial hazards, 
    and dynamically formulates a penalized Valhalla payload.
    """
    o_lon, o_lat = origin
    d_lon, d_lat = destination
    
    # 1. Calculate Broad Bounding Box (Padded by ~0.05 degrees / ~5km for route deviation corridor)
    min_lon, max_lon = min(o_lon, d_lon) - 0.05, max(o_lon, d_lon) + 0.05
    min_lat, max_lat = min(o_lat, d_lat) - 0.05, max(o_lat, d_lat) + 0.05

    # 2. Query PostGIS for active hazards within the routing corridor
    bounding_box = ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    
    # Query spatial intersection directly using the GiST index
    stmt = select(
        func.ST_X(CrowdsourcedHazard.location).label("lon"),
        func.ST_Y(CrowdsourcedHazard.location).label("lat")
    ).where(
        CrowdsourcedHazard.is_active == True,
        CrowdsourcedHazard.location.ST_Intersects(bounding_box)
    )
    
    result = await db.execute(stmt)
    hazards = result.all()

    # 3. Dynamic Costing Injection for Valhalla
    # PostGIS stores points, and we map them to Valhalla's {"lat": float, "lon": float} requirement
    avoid_locations = [{"lon": row.lon, "lat": row.lat} for row in hazards]

    valhalla_payload = {
        "locations": [
            {"lon": o_lon, "lat": o_lat},
            {"lon": d_lon, "lat": d_lat}
        ],
        "costing": costing,
        "avoid_locations": avoid_locations,
        "directions_options": {"units": "km"}
    }

    # 4. Asynchronous Proxy Execution to Local Valhalla Container
    async with httpx.AsyncClient() as client:
        response = await client.post(VALHALLA_URL, json=valhalla_payload)
        response.raise_for_status()
        return response.json()
