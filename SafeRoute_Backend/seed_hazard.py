import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.elements import WKTElement
import datetime

from src.db.database import get_async_db, async_session_maker
from src.models.hazards import CrowdsourcedHazard

async def seed_hazard():
    async with async_session_maker() as session:
        # Madhapur ROADBLOCK
        hazard = CrowdsourcedHazard(
            id=1,
            hazard_type="ROADBLOCK",
            location=WKTElement(f"POINT({78.3908} {17.4485})", srid=4326),
            reported_by_uid="system",
            is_active=True,
            upvotes=100
        )
        session.add(hazard)
        await session.commit()
        print("Mock Hazard 'ROADBLOCK' at [78.3908, 17.4485] successfully seeded into PostGIS.")

if __name__ == "__main__":
    asyncio.run(seed_hazard())
