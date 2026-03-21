from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class SiloCreate(BaseModel):
    name: str
    location: Optional[str] = None
    capacity_kg: Optional[float] = None


class SiloResponse(BaseModel):
    id: UUID4
    name: str
    location: Optional[str] = None
    capacity_kg: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SiloDetailResponse(BaseModel):
    id: UUID4
    name: str
    location: Optional[str] = None
    capacity_kg: Optional[float] = None
    created_at: datetime
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    ndvi: Optional[float] = None
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    crop_type: Optional[str] = "Wheat"

    class Config:
        from_attributes = True