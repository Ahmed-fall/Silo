from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.risk import classify
from app.models.silo import SiloCreate, SiloResponse, SiloDetailResponse, SiloClaim
from typing import List
import asyncio
import uuid
import secrets

router = APIRouter(prefix="/silos", tags=["silos"])

_RISK_RANK = {"low": 1, "medium": 2, "high": 3}


async def resolve_condition(row: dict) -> dict:
    """Current silo condition = the more severe of:
    (a) live model classification of the latest sensor reading — so the badge
        recovers when readings normalize instead of freezing on the last
        alert ever raised, and
    (b) the latest alert if it's < 6h old — so vision-detected disease
        (invisible to the sensor classifier) still surfaces.
    No readings and no recent alert -> risk fields cleared (UI shows Nominal).
    """
    out = dict(row)
    out.pop("alert_recent", None)

    live = None
    if row.get("recorded_at_latest") is not None or row.get("ndvi") is not None or row.get("temperature") is not None:
        live = await classify(row.get("temperature"), row.get("humidity"), row.get("soil_moisture"), row.get("ndvi"))

    alert_level = row.get("risk_level") if row.get("alert_recent") else None
    alert_rank = _RISK_RANK.get((alert_level or "").lower(), 0)
    live_rank = _RISK_RANK.get(live["risk_level"], 0) if live else 0

    if live_rank == 0 and alert_rank == 0:
        out["risk_level"] = None
        out["risk_score"] = None
    elif alert_rank > live_rank:
        out["risk_level"] = alert_level
        out["risk_score"] = row.get("risk_score")
    else:
        out["risk_level"] = live["risk_level"]
        out["risk_score"] = live["risk_score"]
    return out

# Unambiguous alphabet (no 0/O, 1/I/L) — codes get read aloud or retyped.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def _generate_claim_code() -> str:
    raw = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"


@router.post("/claim", response_model=SiloResponse)
async def claim_silo(payload: SiloClaim, current_user: dict = Depends(get_current_user)):
    """Farmer redeems a claim code (from the government) to attach the silo
    to their own dashboard. Single-use: the code is cleared on success."""
    db = await get_db()
    code = payload.code.strip().upper()

    silo = await db.fetchrow("SELECT id, owner_id FROM silos WHERE claim_code = $1", code)
    if not silo:
        raise HTTPException(status_code=404, detail="Invalid or already-used claim code")
    if silo["owner_id"] and silo["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=409, detail="This silo is already claimed by another account")

    row = await db.fetchrow(
        "UPDATE silos SET owner_id = $1, claim_code = NULL WHERE id = $2 RETURNING *",
        current_user["id"],
        silo["id"],
    )
    return dict(row)


@router.post("/{silo_id}/release", response_model=SiloResponse)
async def release_silo(silo_id: uuid.UUID, current_user: dict = Depends(get_current_user)):
    """Farmer removes a silo from their own dashboard — the inverse of
    /silos/claim. This is a soft release, not a delete: the silo row, its
    sensor history, alerts, and images are all untouched, only owner_id is
    cleared. The silo then stays visible to the government web (which lists
    all silos regardless of owner) and re-claimable — either by government
    generating a fresh code for a new farmer (POST /silos/{id}/claim-code
    already lazily mints one for any silo with no active code) or by the
    same farmer redeeming a new code to add it back later."""
    db = await get_db()

    silo = await db.fetchrow("SELECT id, owner_id FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")
    if silo["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not own this silo")

    row = await db.fetchrow(
        "UPDATE silos SET owner_id = NULL WHERE id = $1 RETURNING *",
        silo_id,
    )
    return dict(row)


@router.post("/{silo_id}/claim-code")
async def generate_claim_code(silo_id: uuid.UUID):
    """Government web: get (or lazily create) the silo's unique claim code to
    hand to a farmer. Stable until redeemed; redeeming clears it, after which
    this endpoint mints a fresh one."""
    db = await get_db()

    silo = await db.fetchrow("SELECT id, claim_code FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")
    if silo["claim_code"]:
        return {"silo_id": str(silo_id), "claim_code": silo["claim_code"]}

    # Retry on the (unlikely) unique-constraint collision.
    for _ in range(5):
        code = _generate_claim_code()
        try:
            row = await db.fetchrow(
                "UPDATE silos SET claim_code = $1 WHERE id = $2 RETURNING claim_code",
                code,
                silo_id,
            )
            return {"silo_id": str(silo_id), "claim_code": row["claim_code"]}
        except Exception:
            continue
    raise HTTPException(status_code=500, detail="Could not generate a unique claim code")


@router.post("/", response_model=SiloResponse)
async def create_silo(silo: SiloCreate):
    db = await get_db()
    row = await db.fetchrow(
        """
        INSERT INTO silos (name, location, capacity_kg, risk_level, crop_type, owner_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """,
        silo.name,
        silo.location,
        silo.capacity_kg,
        silo.risk_level,
        silo.crop_type,
        silo.owner_id,
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
            s.owner_id,
            s.crop_type,
            sr.temperature,
            sr.humidity,
            sr.soil_moisture,
            sr.ndvi,
            a.risk_level,
            a.risk_score,
            (a.triggered_at > NOW() - INTERVAL '6 hours') AS alert_recent
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
        ORDER BY s.created_at DESC
        """
    )
    return list(await asyncio.gather(*(resolve_condition(dict(row)) for row in rows)))


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
            s.owner_id,
            s.crop_type,
            sr.temperature,
            sr.humidity,
            sr.soil_moisture,
            sr.ndvi,
            a.risk_level,
            a.risk_score,
            (a.triggered_at > NOW() - INTERVAL '6 hours') AS alert_recent
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
        WHERE s.id = $1
        """,
        silo_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Silo not found")
    return await resolve_condition(dict(row))