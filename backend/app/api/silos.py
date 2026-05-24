from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.models.silo import SiloCreate, SiloResponse, SiloDetailResponse
from typing import List
import uuid

router = APIRouter(prefix="/silos", tags=["silos"])


@router.post("/", response_model=SiloResponse)
async def create_silo(silo: SiloCreate):
    db = await get_db()
    row = await db.fetchrow(
        """
        INSERT INTO silos (name, location, capacity_kg, risk_level, crop_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        silo.name,
        silo.location,
        silo.capacity_kg,
        silo.risk_level,
        silo.crop_type,
    )
    return dict(row)


@router.get("", response_model=List[SiloDetailResponse])
async def get_silos():
    db = await get_db()
    rows = await db.fetch(
        """
        SELECT
            s.id,
            s.name,
            s.location,
            s.capacity_kg,
            s.created_at,
            sr.temperature,
            sr.humidity,
            sr.soil_moisture,
            sr.ndvi,
            a.risk_level,
            a.risk_score
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
        ORDER BY s.created_at DESC
        """
    )
    return [dict(row) for row in rows]


@router.get("/{silo_id}", response_model=SiloDetailResponse)
async def get_silo(silo_id: uuid.UUID):
    db = await get_db()
    row = await db.fetchrow(
        """
        SELECT
            s.id,
            s.name,
            s.location,
            s.capacity_kg,
            s.created_at,
            sr.temperature,
            sr.humidity,
            sr.soil_moisture,
            sr.ndvi,
            a.risk_level,
            a.risk_score
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
        WHERE s.id = $1
        """,
        silo_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Silo not found")
    return dict(row)