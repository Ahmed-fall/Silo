import httpx
import logging
from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)

# Uses the legacy FCM HTTP API (server key auth) for simplicity. This is
# deprecated by Google in favor of the HTTP v1 API (which needs a service
# account + OAuth), but is kept here as a best-effort integration point:
# if FCM_SERVER_KEY is not set, this is a silent no-op and only the existing
# /ws/alerts websocket stream fires. Swap this out for HTTP v1 when a real
# Firebase service account is provisioned for production.
_FCM_LEGACY_URL = "https://fcm.googleapis.com/fcm/send"


async def send_push_to_silo_owner(silo_id, title: str, body: str) -> None:
    if not settings.fcm_server_key:
        logger.debug("FCM_SERVER_KEY not configured — skipping push for silo %s", silo_id)
        return

    db = await get_db()
    rows = await db.fetch(
        """
        SELECT dt.token
        FROM device_tokens dt
        JOIN silos s ON s.owner_id = dt.user_id
        WHERE s.id = $1
        """,
        silo_id,
    )
    tokens = [r["token"] for r in rows]
    if not tokens:
        return

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                _FCM_LEGACY_URL,
                headers={
                    "Authorization": f"key={settings.fcm_server_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "registration_ids": tokens,
                    "notification": {"title": title, "body": body},
                    "data": {"silo_id": str(silo_id)},
                },
                timeout=5.0,
            )
    except Exception as e:
        logger.warning("Push notification send failed: %s", e)
