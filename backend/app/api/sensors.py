from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.core.config import settings
from app.models.sensor import SensorCreate, SensorResponse
from app.models.alert import AlertResponse
from typing import List
import uuid
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.post("/ingest", response_model=SensorResponse)
async def ingest_sensor(sensor: SensorCreate):
    db = await get_db()

    silo = await db.fetchrow("SELECT id, name FROM silos WHERE id = $1", sensor.silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    row = await db.fetchrow(
        """
        INSERT INTO sensor_readings (silo_id, temperature, humidity, soil_moisture, ndvi)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        sensor.silo_id,
        sensor.temperature,
        sensor.humidity,
        sensor.soil_moisture,
        sensor.ndvi,
    )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.ai_predictive_url}/predict",
                json={
                    "temperature": sensor.temperature or 25.0,
                    "humidity": sensor.humidity or 60.0,
                    "soil_moisture": sensor.soil_moisture or 20.0,
                    "ndvi": sensor.ndvi or 0.5,
                },
                timeout=5.0,
            )
            result = response.json()

            if result.get("status") == "ok" and result.get("risk_level") == "high":
                message = (
                    f"High spoilage risk detected in {silo['name']}. "
                    f"Risk score: {result['risk_score']}%. "
                    f"Temperature: {sensor.temperature}°C, Humidity: {sensor.humidity}%."
                )
                await db.execute(
                    """
                    INSERT INTO alerts (silo_id, risk_level, risk_score, message)
                    VALUES ($1, $2, $3, $4)
                    """,
                    sensor.silo_id,
                    result["risk_level"],
                    result["risk_score"],
                    message,
                )

                from app.ws.alerts import manager
                severity_map = {"high": "critical", "medium": "warning", "low": "info"}
                await manager.broadcast({
                    "silo_id": str(sensor.silo_id),
                    "silo_name": silo["name"],
                    "risk_level": result["risk_level"],
                    "risk_score": result["risk_score"],
                    "severity": severity_map.get(result["risk_level"], "info"),
                    "message": message,
                    "timestamp": str(row["recorded_at"]),
                    "read": False,
                    "id": str(row["id"]),
                    "triggered_at": str(row["recorded_at"]),
})

    except Exception as e:
        logger.warning(f"Predictive service unavailable: {e}")

    return dict(row)


@router.get("/{silo_id}", response_model=List[SensorResponse])
async def get_sensor_readings(silo_id: uuid.UUID):
    db = await get_db()

    silo = await db.fetchrow("SELECT id FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    rows = await db.fetch(
        """
        SELECT * FROM sensor_readings
        WHERE silo_id = $1
        ORDER BY recorded_at DESC
        """,
        silo_id,
    )
    return [dict(row) for row in rows]