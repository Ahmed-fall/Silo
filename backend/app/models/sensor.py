from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class SensorCreate(BaseModel):
    silo_id: UUID4
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    ndvi: Optional[float] = None


class SensorResponse(BaseModel):
    id: UUID4
    silo_id: UUID4
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    ndvi: Optional[float] = None
    recorded_at: datetime

    class Config:
        from_attributes = True  