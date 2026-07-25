from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.core.notify import send_telegram_message, send_whatsapp_message, format_notification_text
from app.models.notification import (
    NotificationRecipientCreate,
    NotificationRecipientUpdate,
    NotificationRecipientResponse,
)
from typing import List
import uuid

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/recipients", response_model=List[NotificationRecipientResponse])
async def list_recipients():
    """Government web dashboard: everyone currently set up to receive
    WhatsApp/Telegram alerts, independent of any silo's ownership."""
    db = await get_db()
    rows = await db.fetch("SELECT * FROM notification_recipients ORDER BY created_at DESC")
    return [dict(r) for r in rows]


@router.post("/recipients", response_model=NotificationRecipientResponse)
async def create_recipient(recipient: NotificationRecipientCreate):
    db = await get_db()
    row = await db.fetchrow(
        """
        INSERT INTO notification_recipients
            (name, phone_number, telegram_chat_id, whatsapp_enabled, telegram_enabled, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """,
        recipient.name,
        recipient.phone_number,
        recipient.telegram_chat_id,
        recipient.whatsapp_enabled,
        recipient.telegram_enabled,
        recipient.is_active,
    )
    return dict(row)


@router.patch("/recipients/{recipient_id}", response_model=NotificationRecipientResponse)
async def update_recipient(recipient_id: uuid.UUID, patch: NotificationRecipientUpdate):
    db = await get_db()
    existing = await db.fetchrow("SELECT * FROM notification_recipients WHERE id = $1", recipient_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Recipient not found")

    merged = {**dict(existing), **patch.model_dump(exclude_unset=True)}
    row = await db.fetchrow(
        """
        UPDATE notification_recipients
        SET name = $2, phone_number = $3, telegram_chat_id = $4,
            whatsapp_enabled = $5, telegram_enabled = $6, is_active = $7
        WHERE id = $1
        RETURNING *
        """,
        recipient_id,
        merged["name"],
        merged["phone_number"],
        merged["telegram_chat_id"],
        merged["whatsapp_enabled"],
        merged["telegram_enabled"],
        merged["is_active"],
    )
    return dict(row)


@router.delete("/recipients/{recipient_id}", status_code=204)
async def delete_recipient(recipient_id: uuid.UUID):
    db = await get_db()
    result = await db.execute("DELETE FROM notification_recipients WHERE id = $1", recipient_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Recipient not found")


@router.post("/recipients/{recipient_id}/test")
async def send_test_message(recipient_id: uuid.UUID):
    """Lets the government web UI verify a recipient's WhatsApp/Telegram
    config before relying on it for real alerts."""
    db = await get_db()
    recipient = await db.fetchrow("SELECT * FROM notification_recipients WHERE id = $1", recipient_id)
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")

    text = format_notification_text(
        "Silo Test Notification",
        "This is a test message confirming your Silo alert notifications are configured correctly.",
    )
    results = {}
    if recipient["telegram_enabled"] and recipient["telegram_chat_id"]:
        try:
            await send_telegram_message(recipient["telegram_chat_id"], text)
            results["telegram"] = "sent"
        except Exception as e:
            results["telegram"] = f"failed: {e}"
    if recipient["whatsapp_enabled"] and recipient["phone_number"]:
        try:
            await send_whatsapp_message(recipient["phone_number"], text)
            results["whatsapp"] = "sent"
        except Exception as e:
            results["whatsapp"] = f"failed: {e}"

    if not results:
        raise HTTPException(status_code=400, detail="Recipient has no enabled channel configured")
    return results
