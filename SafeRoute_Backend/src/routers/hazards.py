from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_MakeEnvelope
from typing import List

from src.db.database import get_async_db
from src.dependencies import verify_firebase_token
from src.schemas.hazards import HazardCreate, HazardResponse
from src.models.hazards import CrowdsourcedHazard

router = APIRouter(prefix="/api/v1/hazards", tags=["Hazards"])

@router.post("/", response_model=HazardResponse)
async def create_hazard(
    hazard_in: HazardCreate,
    uid: str = Depends(verify_firebase_token),
    db: AsyncSession = Depends(get_async_db)
):
    # Convert incoming [lon, lat] float to WKT Point for PostGIS
    lon, lat = hazard_in.coordinates
    point_wkt = f"POINT({lon} {lat})"
    
    new_hazard = CrowdsourcedHazard(
        hazard_type=hazard_in.hazard_type,
        location=WKTElement(point_wkt, srid=4326),
        reported_by_uid=uid
    )
    db.add(new_hazard)
    await db.commit()
    await db.refresh(new_hazard)
    
    return HazardResponse(
        id=new_hazard.id,
        hazard_type=new_hazard.hazard_type,
        coordinates=(lon, lat),
        upvotes=new_hazard.upvotes
    )

@router.get("/nearby", response_model=List[HazardResponse])
async def get_nearby_hazards(
    min_lon: float, min_lat: float, 
    max_lon: float, max_lat: float,
    db: AsyncSession = Depends(get_async_db)
):
    # Uses PostGIS ST_MakeEnvelope for a blazing-fast GiST indexed bounding box query
    bounding_box = ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    
    # Utilizing SQLAlchemy 2.0 Async select statement
    stmt = select(
        CrowdsourcedHazard.id,
        CrowdsourcedHazard.hazard_type,
        func.ST_X(CrowdsourcedHazard.location).label("lon"),
        func.ST_Y(CrowdsourcedHazard.location).label("lat"),
        CrowdsourcedHazard.upvotes
    ).where(
        CrowdsourcedHazard.is_active == True,
        # Native PostGIS intersection operator natively leverages the index
        CrowdsourcedHazard.location.ST_Intersects(bounding_box)
    )
    
    result = await db.execute(stmt)
    
    # Return cleanly mapped data ready for frontend mapping layers
    return [
        HazardResponse(
            id=row.id,
            hazard_type=row.hazard_type,
            coordinates=(row.lon, row.lat),
            upvotes=row.upvotes
        ) for row in result
    ]
