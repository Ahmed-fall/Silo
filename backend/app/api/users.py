from fastapi import APIRouter, Depends, Query
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.silo import SiloDetailResponse
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

_SEVERITY_MAP = {"high": "critical", "medium": "warning", "low": "info"}


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
            SELECT risk_level, risk_score
            FROM alerts
            WHERE silo_id = s.id
            ORDER BY triggered_at DESC
            LIMIT 1
        ) a ON true
        WHERE s.owner_id = $1
        ORDER BY s.created_at DESC
        """,
        current_user["id"],
    )
    return [dict(row) for row in rows]


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
            "severity": _SEVERITY_MAP.get(row["risk_level"], "info"),
            "risk_level": row["risk_level"],
            "risk_score": row["risk_score"],
            "timestamp": row["triggered_at"].isoformat(),
            "read": row["is_read"],
            "kind": row["kind"],
            "predicted_for": row["predicted_for"].isoformat() if row["predicted_for"] else None,
        }
        for row in rows
    ]
