import asyncio
import logging
from sqlalchemy import text
from src.db.database import engine
from src.models.hazards import Base

# Configure basic logging for the script
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db():
    """
    Initializes the database by enabling the PostGIS extension 
    and creating all tables based on SQLAlchemy declarative models.
    """
    logger.info("Connecting to PostgreSQL to initialize database...")
    
    # 1. Start a connection to enable PostGIS
    async with engine.begin() as conn:
        logger.info("Executing: CREATE EXTENSION IF NOT EXISTS postgis;")
        # We must execute this raw SQL to activate spatial functions in the DB
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        logger.info("PostGIS extension successfully activated.")

        # 2. Run synchronous declarative base creation inside a thread-safe wrapper
        logger.info("Creating SQLAlchemy metadata tables and GiST indexes...")
        # run_sync bridges the async engine to synchronous SQLAlchemy table creation
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Tables and spatial indexes created successfully.")
        
    # Cleanup engine connections
    await engine.dispose()
    logger.info("Database initialization complete.")

if __name__ == "__main__":
    # Execute the async initialization function
    asyncio.run(init_db())
