from fastapi import APIRouter, HTTPException, UploadFile, File
from app.core.database import get_db
from app.core.config import settings
from app.models.image import ImageResponse
from app.data.treatment_protocols import TREATMENT_PROTOCOLS
from typing import List
import uuid
import os
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/images", tags=["images"])

CRITICAL_TIER_THRESHOLD = 8


def _resolve_tier(label: str, confidence_0_to_1: float) -> dict | None:
    tiers = TREATMENT_PROTOCOLS.get(label)
    if not tiers:
        return None
    confidence_pct = confidence_0_to_1 * 100
    matched = tiers[-1]
    for t in tiers:
        if t["confidence_min"] <= confidence_pct < t["confidence_max"]:
            matched = t
            break
    return matched


@router.post("/upload", response_model=ImageResponse)
async def upload_image(silo_id: uuid.UUID, file: UploadFile = File(...)):
    db = await get_db()

    silo = await db.fetchrow("SELECT id, name FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.uploads_dir, filename)

    os.makedirs(settings.uploads_dir, exist_ok=True)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    row = await db.fetchrow(
        """
        INSERT INTO images (silo_id, file_path)
        VALUES ($1, $2)
        RETURNING *
        """,
        silo_id,
        file_path,
    )

    detected_label = None
    confidence = None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.ai_vision_url}/analyze",
                files={"file": (filename, contents, file.content_type)},
                timeout=10.0,
            )
            result = response.json()

            if result.get("status") == "ok":
                detected_label = result.get("label")
                confidence = result.get("confidence")

                await db.execute(
                    """
                    UPDATE images
                    SET detected_label = $1, confidence = $2
                    WHERE id = $3
                    """,
                    detected_label,
                    confidence,
                    row["id"],
                )

                # Auto-alert: if disease tier >= 8 (Critical / Extreme / Catastrophic)
                if detected_label and detected_label != "Healthy Wheat" and confidence is not None:
                    tier = _resolve_tier(detected_label, confidence)
                    if tier and tier["tier"] >= CRITICAL_TIER_THRESHOLD:
                        silo_name = silo["name"]
                        message = (
                            f"AI Vision detected {detected_label} ({tier['severity_label']}) "
                            f"at {round(confidence * 100, 1)}% confidence in {silo_name}. "
                            f"Tier {tier['tier']} — immediate treatment required."
                        )
                        alert_row = await db.fetchrow(
                            """
                            INSERT INTO alerts (silo_id, risk_level, risk_score, message)
                            VALUES ($1, $2, $3, $4)
                            RETURNING *
                            """,
                            silo_id,
                            tier["severity_label"].lower(),
                            round(confidence * 100, 1),
                            message,
                        )
                        try:
                            from app.ws.alerts import manager
                            await manager.broadcast({
                                "silo_id": str(silo_id),
                                "silo_name": silo_name,
                                "risk_level": tier["severity_label"].lower(),
                                "risk_score": round(confidence * 100, 1),
                                "severity": "critical",
                                "message": message,
                                "timestamp": str(alert_row["triggered_at"]),
                                "read": False,
                                "id": str(alert_row["id"]),
                                "triggered_at": str(alert_row["triggered_at"]),
                            })
                        except Exception as ws_err:
                            logger.warning("WebSocket broadcast failed: %s", ws_err)

    except Exception as e:
        logger.warning(f"Vision service unavailable: {e}")

    updated_row = await db.fetchrow(
        "SELECT * FROM images WHERE id = $1", row["id"]
    )
    return dict(updated_row)


@router.get("/{silo_id}", response_model=List[ImageResponse])
async def get_images(silo_id: uuid.UUID):
    db = await get_db()

    silo = await db.fetchrow("SELECT id FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    rows = await db.fetch(
        """
        SELECT * FROM images
        WHERE silo_id = $1
        ORDER BY uploaded_at DESC
        """,
        silo_id,
    )
    return [dict(row) for row in rows]