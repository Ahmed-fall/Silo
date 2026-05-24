from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.models.alert import AlertResponse
from typing import List
import uuid

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/{silo_id}", response_model=List[AlertResponse])
async def get_alerts(silo_id: uuid.UUID):
    db = await get_db()

    silo = await db.fetchrow("SELECT id FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    rows = await db.fetch(
        """
        SELECT * FROM alerts
        WHERE silo_id = $1
        ORDER BY triggered_at DESC
        """,
        silo_id,
    )
    return [dict(row) for row in rows]


@router.patch("/{alert_id}/read", response_model=AlertResponse)
async def mark_alert_read(alert_id: uuid.UUID):
    db = await get_db()

    row = await db.fetchrow(
        """
        UPDATE alerts
        SET is_read = TRUE
        WHERE id = $1
        RETURNING *
        """,
        alert_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    return dict(row)