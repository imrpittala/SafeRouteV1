from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from src.db.database import get_async_db
from src.services.routing_service import get_safe_route
from src.dependencies import verify_firebase_token

router = APIRouter(prefix="/api/v1/route", tags=["Routing"])

class RouteRequest(BaseModel):
    origin: tuple[float, float]      # Strictly [lon, lat]
    destination: tuple[float, float] # Strictly [lon, lat]
    mode: str = "auto"               # Options: auto, pedestrian, bicycle

@router.post("/safe")
async def calculate_safe_route(
    request: RouteRequest,
    uid: str = Depends(verify_firebase_token), # Secure endpoint
    db: AsyncSession = Depends(get_async_db)
):
    """
    Calculates a safe route by intercepting the request, querying PostGIS for active hazards
    along the corridor, and dynamically injecting them into Valhalla's costing engine.
    """
    try:
        route_data = await get_safe_route(
            db=db, 
            origin=request.origin, 
            destination=request.destination, 
            costing=request.mode
        )
        return {"status": "success", "route": route_data}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Valhalla Engine Error: {e.response.text}")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Valhalla Engine Unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
