from fastapi import APIRouter, HTTPException
from app.core.database import get_db
from app.core.config import settings
from app.models.sensor import SensorCreate, SensorResponse
from app.models.alert import AlertResponse
from typing import List, Dict, Any
import uuid
import httpx
import logging
import joblib
import os
import numpy as np
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sensors", tags=["sensors"])

# Load predictive models at startup
_project_root = os.path.join(os.path.dirname(__file__), "../../..")
_model_dir = os.path.join(_project_root, "ai-predictive", "app", "model", "weights")
try:
    _predictive_model = joblib.load(os.path.join(_model_dir, "crop_health_model_xgb.pkl"))
    _label_encoder = joblib.load(os.path.join(_model_dir, "label_encoder.pkl"))
    _models_loaded = True
    logger.info("Predictive models loaded from %s", _model_dir)
except Exception as e:
    logger.warning("Could not load predictive models: %s", e)
    _models_loaded = False
    _predictive_model = None
    _label_encoder = None


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
        logger.warning("Predictive service unavailable: %s", e)

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


@router.get("/forecast/{silo_id}")
async def get_forecast(silo_id: uuid.UUID):
    """
    Generate a 12-hour forecast based on recent sensor readings and predictive model.
    Returns SensorReading[] format expected by the frontend chart.
    """
    db = await get_db()

    silo = await db.fetchrow("SELECT id FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    # Get last 24 hours of sensor readings
    rows = await db.fetch(
        """
        SELECT temperature, humidity, soil_moisture, ndvi, recorded_at
        FROM sensor_readings
        WHERE silo_id = $1
        ORDER BY recorded_at DESC
        LIMIT 24
        """,
        silo_id,
    )

    if not rows:
        return []

    # Use the most recent reading as the baseline
    last = rows[0]
    base_temp = float(last.get("temperature") or 25.0)
    base_hum = float(last.get("humidity") or 60.0)
    base_soil = float(last.get("soil_moisture") or 20.0)
    base_ndvi = float(last.get("ndvi") or 0.5)
    last_time_raw = last.get("recorded_at")

    # Ensure last_time is a datetime object
    if isinstance(last_time_raw, str):
        last_time = datetime.fromisoformat(last_time_raw)
    elif last_time_raw is None:
        last_time = datetime.now()
    else:
        last_time = last_time_raw

    # If we have historical data, compute trend from it
    if len(rows) >= 2:
        prev = rows[1]
        prev_temp = float(prev.get("temperature") or base_temp)
        prev_hum = float(prev.get("humidity") or base_hum)
        temp_trend = base_temp - prev_temp
        hum_trend = base_hum - prev_hum
    else:
        temp_trend = 0.0
        hum_trend = 0.0

    # Generate 12-hour forecast
    forecast: List[Dict[str, Any]] = []
    current_temp = base_temp
    current_hum = base_hum

    for hour in range(1, 13):
        # Apply dampened trend + small variation
        current_temp = current_temp + (temp_trend * 0.7) + (np.random.random() - 0.5) * 0.8
        current_hum = current_hum + (hum_trend * 0.7) + (np.random.random() - 0.5) * 1.0

        # Clamp to realistic ranges
        current_temp = max(5.0, min(50.0, current_temp))
        current_hum = max(10.0, min(100.0, current_hum))

        # Use predictive model to adjust forecast based on risk
        if _models_loaded and _predictive_model is not None:
            try:
                features = np.array([[current_temp, current_hum, base_soil, base_ndvi]])
                prediction = _predictive_model.predict(features)[0]
                label = _label_encoder.inverse_transform([prediction])[0]

                # Adjust forecast slightly based on risk classification
                if label == "Critical":
                    current_temp = current_temp + 0.5
                    current_hum = current_hum + 1.0
                elif label == "Healthy":
                    current_temp = current_temp - 0.3
                    current_hum = current_hum - 0.5
            except Exception:
                pass  # fallback to trend-based forecast

        forecast_time = last_time + timedelta(hours=hour)
        # Ensure recorded_at is a string in ISO format
        recorded_at_str = forecast_time.isoformat() if hasattr(forecast_time, "isoformat") else str(forecast_time)

        forecast.append({
            "recorded_at": recorded_at_str,
            "temperature": round(float(current_temp), 2),
            "humidity": round(float(current_hum), 2),
        })

    return forecast