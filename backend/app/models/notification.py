from pydantic import BaseModel, UUID4, model_validator
from typing import Optional
from datetime import datetime


class NotificationRecipientCreate(BaseModel):
    """A duty officer on the unauthenticated government web dashboard who
    should be notified on WhatsApp/Telegram for every silo alert, regardless
    of silo ownership. See app/core/notify.py::_notify_ops_recipients."""
    name: str
    phone_number: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    whatsapp_enabled: bool = False
    telegram_enabled: bool = False
    is_active: bool = True

    @model_validator(mode="after")
    def check_contact_present(self):
        if not self.phone_number and not self.telegram_chat_id:
            raise ValueError("At least one of phone_number or telegram_chat_id is required")
        if self.whatsapp_enabled and not self.phone_number:
            raise ValueError("phone_number is required to enable WhatsApp")
        if self.telegram_enabled and not self.telegram_chat_id:
            raise ValueError("telegram_chat_id is required to enable Telegram")
        return self


class NotificationRecipientUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    whatsapp_enabled: Optional[bool] = None
    telegram_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


class NotificationRecipientResponse(BaseModel):
    id: UUID4
    name: str
    phone_number: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    whatsapp_enabled: bool
    telegram_enabled: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
