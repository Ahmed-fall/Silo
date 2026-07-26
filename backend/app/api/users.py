from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.notify import send_telegram_message, send_whatsapp_message, format_notification_text
from app.api.silos import resolve_condition
from app.core.risk import SEVERITY_MAP
from app.models.silo import SiloDetailResponse
from app.models.user import UserResponse, NotificationPreferencesUpdate
from typing import List
import asyncio

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/silos", response_model=List[SiloDetailResponse])
async def get_my_silos(current_user: dict = Depends(get_current_user)):
    """Silos owned by the logged-in farmer only — this is the mobile app's
    'My Silos' dashboard endpoint, as opposed to GET /silos which returns
    every silo in the system for the (unauthenticated) government web view."""
    db = await get_db()
    rows = await db.fetch(
        """
        SELECT
            s.id,
            s.name,
            s.location,
            s.capacity_kg,
            s.created_at,
            s.owner_id,
            sr.temperature,
            sr.humidity,
            sr.soil_moisture,
            sr.ndvi,
            a.risk_level,
            a.risk_score,
            (a.triggered_at > NOW() - INTERVAL '6 hours') AS alert_recent,
            s.crop_type
        FROM silos s
        LEFT JOIN LATERAL (
            SELECT temperature, humidity, soil_moisture, ndvi
            FROM sensor_readings
            WHERE silo_id = s.id
            ORDER BY recorded_at DESC
            LIMIT 1
        ) sr ON true
        LEFT JOIN LATERAL (
            SELECT risk_level, risk_score, triggered_at
            FROM alerts
            WHERE silo_id = s.id AND kind = 'measured'
            ORDER BY triggered_at DESC
            LIMIT 1
        ) a ON true
        WHERE s.owner_id = $1
        ORDER BY s.created_at DESC
        """,
        current_user["id"],
    )
    return list(await asyncio.gather(*(resolve_condition(dict(row)) for row in rows)))


@router.get("/me/alerts")
async def get_my_alerts(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, gt=0, le=200),
    unread_only: bool = Query(False),
):
    """Alert feed across every silo the caller owns, newest first. This is
    what a client hydrates from on load/refresh; live updates then layer on
    top via /ws/alerts. Replaces the per-silo fan-out-and-merge workaround."""
    db = await get_db()

    query = """
        SELECT a.id, a.silo_id, s.name AS silo_name, a.risk_level, a.risk_score,
               a.message, a.triggered_at, a.is_read, a.kind, a.predicted_for
        FROM alerts a
        JOIN silos s ON s.id = a.silo_id
        WHERE s.owner_id = $1
    """
    params: list = [current_user["id"]]
    if unread_only:
        query += " AND a.is_read = FALSE"
    query += f" ORDER BY a.triggered_at DESC LIMIT ${len(params) + 1}"
    params.append(limit)

    rows = await db.fetch(query, *params)

    return [
        {
            "id": str(row["id"]),
            "silo_id": str(row["silo_id"]),
            "silo_name": row["silo_name"],
            "message": row["message"],
            "severity": SEVERITY_MAP.get(row["risk_level"], "info"),
            "risk_level": row["risk_level"],
            "risk_score": row["risk_score"],
            "timestamp": row["triggered_at"].isoformat(),
            "read": row["is_read"],
            "kind": row["kind"],
            "predicted_for": row["predicted_for"].isoformat() if row["predicted_for"] else None,
        }
        for row in rows
    ]


@router.patch("/me/notifications", response_model=UserResponse)
async def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Farmer opts in/out of WhatsApp/Telegram for their own silo alerts, on
    top of the existing FCM push. WhatsApp always uses the phone number
    already on the account — there's no separate WhatsApp number field."""
    if payload.whatsapp_enabled and not current_user.get("phone"):
        raise HTTPException(
            status_code=400,
            detail="Add a phone number to your account before enabling WhatsApp notifications",
        )

    merged = {
        "telegram_chat_id": payload.telegram_chat_id if payload.telegram_chat_id is not None else current_user["telegram_chat_id"],
        "whatsapp_enabled": payload.whatsapp_enabled if payload.whatsapp_enabled is not None else current_user["whatsapp_enabled"],
        "telegram_enabled": payload.telegram_enabled if payload.telegram_enabled is not None else current_user["telegram_enabled"],
    }
    if merged["telegram_enabled"] and not merged["telegram_chat_id"]:
        raise HTTPException(status_code=400, detail="telegram_chat_id is required to enable Telegram notifications")

    db = await get_db()
    row = await db.fetchrow(
        """
        UPDATE users
        SET telegram_chat_id = $2, whatsapp_enabled = $3, telegram_enabled = $4
        WHERE id = $1
        RETURNING *
        """,
        current_user["id"],
        merged["telegram_chat_id"],
        merged["whatsapp_enabled"],
        merged["telegram_enabled"],
    )
    return UserResponse(**dict(row))


@router.post("/me/notifications/test")
async def test_notification_preferences(current_user: dict = Depends(get_current_user)):
    """Lets a farmer confirm their WhatsApp/Telegram setup works before
    depending on it for real silo alerts."""
    text = format_notification_text(
        "Silo Test Notification",
        "This is a test message confirming your Silo alert notifications are configured correctly.",
    )
    results = {}
    if current_user.get("telegram_enabled") and current_user.get("telegram_chat_id"):
        try:
            await send_telegram_message(current_user["telegram_chat_id"], text)
            results["telegram"] = "sent"
        except Exception as e:
            results["telegram"] = f"failed: {e}"
    if current_user.get("whatsapp_enabled") and current_user.get("phone"):
        try:
            await send_whatsapp_message(current_user["phone"], text)
            results["whatsapp"] = "sent"
        except Exception as e:
            results["whatsapp"] = f"failed: {e}"

    if not results:
        raise HTTPException(status_code=400, detail="No notification channel is enabled on your account")
    return results
