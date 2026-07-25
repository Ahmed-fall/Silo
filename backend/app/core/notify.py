import asyncio
import logging

import httpx

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

_TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"
_TWILIO_API = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


def format_notification_text(title: str, body: str) -> str:
    return f"🌾 *{title}*\n\n{body}\n\n— Silo Grain Intelligence System"


async def send_telegram_message(chat_id: str, text: str) -> None:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _TELEGRAM_API.format(token=settings.telegram_bot_token),
            json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
            timeout=10.0,
        )
        resp.raise_for_status()


async def send_whatsapp_message(phone_number: str, text: str) -> None:
    if not (settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_whatsapp_from):
        raise RuntimeError("Twilio WhatsApp settings are not fully configured")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            _TWILIO_API.format(sid=settings.twilio_account_sid),
            data={
                "From": f"whatsapp:{settings.twilio_whatsapp_from}",
                "To": f"whatsapp:{phone_number}",
                "Body": text,
            },
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=10.0,
        )
        resp.raise_for_status()


async def _notify_silo_owner(silo_id, text: str) -> None:
    """Mirrors send_push_to_silo_owner's join (silos.owner_id -> users), but
    only sends on channels the farmer has explicitly opted into."""
    db = await get_db()
    owner = await db.fetchrow(
        """
        SELECT u.phone, u.telegram_chat_id, u.whatsapp_enabled, u.telegram_enabled
        FROM users u
        JOIN silos s ON s.owner_id = u.id
        WHERE s.id = $1
        """,
        silo_id,
    )
    if not owner:
        return

    if owner["telegram_enabled"] and owner["telegram_chat_id"]:
        try:
            await send_telegram_message(owner["telegram_chat_id"], text)
        except Exception as e:
            logger.warning("Telegram notification to silo owner failed: %s", e)

    if owner["whatsapp_enabled"] and owner["phone"]:
        try:
            await send_whatsapp_message(owner["phone"], text)
        except Exception as e:
            logger.warning("WhatsApp notification to silo owner failed: %s", e)


async def _notify_ops_recipients(text: str) -> None:
    """Fans out to every active government-dashboard recipient, independent
    of silo ownership — see NotificationRecipientCreate."""
    db = await get_db()
    recipients = await db.fetch(
        """
        SELECT phone_number, telegram_chat_id, whatsapp_enabled, telegram_enabled
        FROM notification_recipients
        WHERE is_active = TRUE AND (whatsapp_enabled = TRUE OR telegram_enabled = TRUE)
        """
    )
    if not recipients:
        return

    async def _dispatch(recipient) -> None:
        if recipient["telegram_enabled"] and recipient["telegram_chat_id"]:
            try:
                await send_telegram_message(recipient["telegram_chat_id"], text)
            except Exception as e:
                logger.warning("Telegram notification to ops recipient failed: %s", e)
        if recipient["whatsapp_enabled"] and recipient["phone_number"]:
            try:
                await send_whatsapp_message(recipient["phone_number"], text)
            except Exception as e:
                logger.warning("WhatsApp notification to ops recipient failed: %s", e)

    await asyncio.gather(*(_dispatch(dict(r)) for r in recipients), return_exceptions=True)


async def dispatch_alert_notifications(silo_id, title: str, body: str) -> None:
    """Single entry point called from sensors.py alongside the existing FCM
    push — reaches both the silo's owning farmer (if any, and opted in) and
    every active government-dashboard recipient. Each path isolates its own
    failures, so one bad recipient/token never affects the other or the
    caller."""
    text = format_notification_text(title, body)
    await asyncio.gather(
        _notify_silo_owner(silo_id, text),
        _notify_ops_recipients(text),
        return_exceptions=True,
    )
