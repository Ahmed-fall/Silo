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