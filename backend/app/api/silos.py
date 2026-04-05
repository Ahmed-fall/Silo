from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.models.silo import SiloCreate, SiloResponse
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


@router.get("/", response_model=List[SiloResponse])
async def get_silos():
    db = await get_db()
    rows = await db.fetch("SELECT * FROM silos ORDER BY created_at DESC")
    return [dict(row) for row in rows]


@router.get("/{silo_id}", response_model=SiloResponse)
async def get_silo(silo_id: uuid.UUID):
    db = await get_db()
    row = await db.fetchrow("SELECT * FROM silos WHERE id = $1", silo_id)
    if not row:
        raise HTTPException(status_code=404, detail="Silo not found")
    return dict(row)