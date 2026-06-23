from sqlalchemy import Column, Integer, String, Boolean, Enum
from geoalchemy2 import Geometry
from sqlalchemy.orm import declarative_base
from src.schemas.hazards import HazardType

Base = declarative_base()

class CrowdsourcedHazard(Base):
    __tablename__ = "hazards"

    id = Column(Integer, primary_key=True, index=True)
    # Using SRID 4326 (WGS 84 standard for GPS)
    # spatial_index=True automatically builds a GiST index
    location = Column(Geometry('POINT', srid=4326, spatial_index=True), nullable=False)
    hazard_type = Column(Enum(HazardType), nullable=False)
    reported_by_uid = Column(String, index=True, nullable=False)
    upvotes = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
