from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class ImageResponse(BaseModel):
    id: UUID4
    silo_id: UUID4
    file_path: str
    detected_label: Optional[str] = None
    confidence: Optional[float] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True