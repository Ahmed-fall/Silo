from pydantic import BaseModel, UUID4
from datetime import datetime
from typing import Literal


class DeviceRegister(BaseModel):
    token: str
    platform: Literal["android", "ios"]


class DeviceResponse(BaseModel):
    id: UUID4
    user_id: UUID4
    token: str
    platform: str
    created_at: datetime

    class Config:
        from_attributes = True
