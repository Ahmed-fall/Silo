from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.models.sensor import SensorCreate, SensorResponse
from typing import List
import uuid

router = APIRouter(prefix="/sensors", tags=["sensors"])


@router.post("/ingest", response_model=SensorResponse)
async def ingest_sensor(sensor: SensorCreate):
    db = await get_db()

    silo = await db.fetchrow("SELECT id FROM silos WHERE id = $1", sensor.silo_id)
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