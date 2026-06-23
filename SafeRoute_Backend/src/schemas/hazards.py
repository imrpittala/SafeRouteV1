from pydantic import BaseModel, field_validator
from typing import Tuple
from enum import Enum

class HazardType(str, Enum):
    CRIME = "CRIME"
    UNLIT = "UNLIT"
    ROADBLOCK = "ROADBLOCK"

class HazardCreate(BaseModel):
    hazard_type: HazardType
    coordinates: Tuple[float, float]  # Strictly [Longitude, Latitude]

    @field_validator('coordinates')
    @classmethod
    def validate_spatial_bounds(cls, coords: Tuple[float, float]) -> Tuple[float, float]:
        lon, lat = coords

        # 1. Strict Mathematical Bounds
        if not (-180.0 <= lon <= 180.0):
            raise ValueError(f"Longitude must be between -180 and 180. Received: {lon}")
        if not (-90.0 <= lat <= 90.0):
            raise ValueError(f"Latitude must be between -90 and 90. Received: {lat}")

        # 2. The "Null Island" Protection
        if lon == 0.0 and lat == 0.0:
            raise ValueError("Coordinates [0.0, 0.0] rejected. GPS failed to initialize.")

        # 3. Precision Check
        if round(lon, 2) == lon or round(lat, 2) == lat:
            raise ValueError("Coordinates lack required precision for a safety hazard. Minimum 4 decimal places required.")

        return coords

class HazardResponse(BaseModel):
    id: int
    hazard_type: HazardType
    coordinates: Tuple[float, float]
    upvotes: int
