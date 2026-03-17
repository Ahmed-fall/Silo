from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class AlertResponse(BaseModel):
    id: UUID4
    silo_id: UUID4
    risk_level: str
    risk_score: Optional[float] = None
    message: Optional[str] = None
    triggered_at: datetime
    is_read: bool

    class Config:
        from_attributes = True