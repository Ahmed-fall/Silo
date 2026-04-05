from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class SiloCreate(BaseModel):
    name: str
    location: Optional[str] = None
    capacity_kg: Optional[float] = None
    risk_level: Optional[str] = "none"
    crop_type: Optional[str] = "wheat"


class SiloResponse(BaseModel):
    id: UUID4
    name: str
    location: Optional[str] = None
    capacity_kg: Optional[float] = None
    risk_level: str
    crop_type: str
    created_at: datetime

    class Config:
        from_attributes = True