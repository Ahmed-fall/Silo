from fastapi import APIRouter, HTTPException, Query
from app.core.database import get_db
from app.core.config import settings
from app.models.sensor import SensorCreate, SensorResponse
from app.models.alert import AlertResponse
from typing import List, Dict, Any, Optional
import uuid
import httpx
import logging
import joblib
import os
import numpy as np
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sensors", tags=["sensors"])

# Load predictive models at startup. This file lives at /app/app/api/sensors.py
# in the container (WORKDIR /app, backend/ copied in as app/), so two levels
# up reaches /app, where the ai-predictive weights volume is mounted.
_project_root = os.path.join(os.path.dirname(__file__), "../..")
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

# Mirrors ai-predictive/app/model/predict.py's mapping, so forecast points
# classified locally line up with the risk_level/risk_score domain the rest
# of the API (and the alerts.risk_level check constraint) already uses.
_LABEL_TO_RISK = {"Critical": "high", "Healthy": "low", "Stressed": "medium"}
_RISK_TO_SCORE = {"high": 75, "medium": 45, "low": 15}


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

            if result.get("status") == "ok" and result.get("risk_level") in ("high", "medium"):
                # Cooldown: a silo sitting in a risk regime produces the same
                # classification on every 20-min reading — don't re-alert at
                # the same level more than once per 2h. Time-based only: it
                # must not reset when a client auto-acks the alert on display.
                recent = await db.fetchrow(
                    """
                    SELECT id FROM alerts
                    WHERE silo_id = $1 AND risk_level = $2 AND kind = 'measured'
                      AND triggered_at > NOW() - INTERVAL '2 hours'
                    """,
                    sensor.silo_id,
                    result["risk_level"],
                )
                if recent:
                    return dict(row)

                level_label = "High" if result["risk_level"] == "high" else "Elevated"
                message = (
                    f"{level_label} spoilage risk detected in {silo['name']}. "
                    f"Risk score: {result['risk_score']}%. "
                    f"Temperature: {sensor.temperature}°C, Humidity: {sensor.humidity}%."
                )
                alert_row = await db.fetchrow(
                    """
                    INSERT INTO alerts (silo_id, risk_level, risk_score, message)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, triggered_at
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
                    "timestamp": str(alert_row["triggered_at"]),
                    "read": False,
                    "id": str(alert_row["id"]),
                    "triggered_at": str(alert_row["triggered_at"]),
                    "kind": "measured",
                })

                try:
                    from app.core.push import send_push_to_silo_owner
                    await send_push_to_silo_owner(sensor.silo_id, "Silo risk alert", message)
                except Exception as push_err:
                    logger.warning("Push notification failed: %s", push_err)

    except Exception as e:
        logger.warning("Predictive service unavailable: %s", e)

    return dict(row)


@router.get("/{silo_id}", response_model=List[SensorResponse])
async def get_sensor_readings(
    silo_id: uuid.UUID,
    since: Optional[datetime] = Query(None, description="Only return readings recorded at or after this ISO-8601 timestamp"),
    limit: Optional[int] = Query(None, gt=0, le=2000, description="Maximum number of most-recent readings to return"),
):
    db = await get_db()

    silo = await db.fetchrow("SELECT id FROM silos WHERE id = $1", silo_id)
    if not silo:
        raise HTTPException(status_code=404, detail="Silo not found")

    query = "SELECT * FROM sensor_readings WHERE silo_id = $1"
    params: list = [silo_id]
    if since is not None:
        params.append(since)
        query += f" AND recorded_at >= ${len(params)}"
    query += " ORDER BY recorded_at DESC"
    if limit is not None:
        params.append(limit)
        query += f" LIMIT ${len(params)}"

    rows = await db.fetch(query, *params)
    return [dict(row) for row in rows]


@router.get("/forecast/{silo_id}")
async def get_forecast(silo_id: uuid.UUID):
    """
    Generate a 12-hour forecast based on recent sensor readings and predictive model.
    Returns SensorReading[] format expected by the frontend chart.
    """
    db = await get_db()

    silo = await db.fetchrow("SELECT id, name FROM silos WHERE id = $1", silo_id)
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
        last_time = datetime.now(timezone.utc)
    else:
        last_time = last_time_raw

    # Anchor forecast hours to now, not the last reading — if ingest has been
    # down for a while, every "forecast" point would otherwise be timestamped
    # in the past.
    anchor_time = max(last_time, datetime.now(timezone.utc))

    # If we have historical data, compute a *per-hour* trend from it. The
    # last two readings may be minutes apart, so normalize by the actual time
    # delta and cap it — otherwise a 20-minute delta applied as an hourly rate
    # over 12 steps triples the real slope and the forecast runs away to the
    # clamps.
    if len(rows) >= 2:
        prev = rows[1]
        prev_temp = float(prev.get("temperature") or base_temp)
        prev_hum = float(prev.get("humidity") or base_hum)
        prev_time = prev.get("recorded_at")
        if isinstance(prev_time, str):
            prev_time = datetime.fromisoformat(prev_time)
        dt_hours = (last_time - prev_time).total_seconds() / 3600 if prev_time else 1.0
        if dt_hours <= 0:
            dt_hours = 1.0
        temp_trend = max(-1.5, min(1.5, (base_temp - prev_temp) / dt_hours))
        hum_trend = max(-2.5, min(2.5, (base_hum - prev_hum) / dt_hours))
    else:
        temp_trend = 0.0
        hum_trend = 0.0

    # Generate 12-hour forecast
    forecast: List[Dict[str, Any]] = []
    current_temp = base_temp
    current_hum = base_hum
    first_crossing: Optional[Dict[str, Any]] = None

    for hour in range(1, 13):
        # Apply the trend, decaying it each step so the projection levels off
        # toward the recent state instead of extrapolating linearly for 12h.
        current_temp = current_temp + temp_trend + (np.random.random() - 0.5) * 0.8
        current_hum = current_hum + hum_trend + (np.random.random() - 0.5) * 1.0
        temp_trend *= 0.7
        hum_trend *= 0.7

        # Clamp to realistic ranges
        current_temp = max(5.0, min(50.0, current_temp))
        current_hum = max(10.0, min(100.0, current_hum))

        # Use predictive model to adjust forecast based on risk
        predicted_risk_level = None
        if _models_loaded and _predictive_model is not None:
            try:
                features = np.array([[current_temp, current_hum, base_soil, base_ndvi]])
                prediction = _predictive_model.predict(features)[0]
                label = _label_encoder.inverse_transform([prediction])[0]
                predicted_risk_level = _LABEL_TO_RISK.get(label)

                # Nudge the projection slightly based on risk classification.
                # Kept small: this feeds back into the next iteration's
                # prediction, so a large nudge is a self-fulfilling runaway.
                if label == "Critical":
                    current_temp = current_temp + 0.15
                    current_hum = current_hum + 0.3
                elif label == "Healthy":
                    current_temp = current_temp - 0.1
                    current_hum = current_hum - 0.2
            except Exception:
                pass  # fallback to trend-based forecast

        forecast_time = anchor_time + timedelta(hours=hour)
        # Ensure recorded_at is a string in ISO format
        recorded_at_str = forecast_time.isoformat() if hasattr(forecast_time, "isoformat") else str(forecast_time)

        forecast.append({
            "recorded_at": recorded_at_str,
            "temperature": round(float(current_temp), 2),
            "humidity": round(float(current_hum), 2),
        })

        if first_crossing is None and predicted_risk_level in ("medium", "high"):
            first_crossing = {
                "risk_level": predicted_risk_level,
                "risk_score": _RISK_TO_SCORE[predicted_risk_level],
                "hours_ahead": hour,
                "predicted_for": forecast_time,
            }

    if first_crossing is not None:
        await _raise_predictive_alert(db, silo_id, silo, first_crossing)

    return forecast


async def _raise_predictive_alert(db, silo_id: uuid.UUID, silo, crossing: Dict[str, Any]) -> None:
    """Persist + broadcast a forward-looking alert for a forecast crossing,
    deduplicated so a standing prediction doesn't re-alert on every poll."""
    try:
        message = (
            f"{crossing['risk_level'].capitalize()} spoilage risk predicted for {silo['name']} "
            f"in ~{crossing['hours_ahead']}h (forecast risk score: {crossing['risk_score']}%)."
        )
        # Dedup in the same statement as the insert (concurrent forecast polls
        # race a separate check-then-insert). Keyed on predicted_for > NOW()
        # rather than is_read: clients auto-ack alerts on display, so an
        # is_read key would re-raise the same standing prediction after every
        # ack. A prediction "stands" until its horizon passes; only then may a
        # new crossing alert again.
        alert_row = await db.fetchrow(
            """
            INSERT INTO alerts (silo_id, risk_level, risk_score, message, kind, predicted_for)
            SELECT $1, $2, $3, $4, 'predicted', $5
            WHERE NOT EXISTS (
                SELECT 1 FROM alerts
                WHERE silo_id = $1 AND kind = 'predicted' AND predicted_for > NOW()
            )
            RETURNING id, triggered_at
            """,
            silo_id,
            crossing["risk_level"],
            crossing["risk_score"],
            message,
            crossing["predicted_for"],
        )
        if alert_row is None:
            return

        from app.ws.alerts import manager
        severity_map = {"high": "critical", "medium": "warning", "low": "info"}
        await manager.broadcast({
            "silo_id": str(silo_id),
            "silo_name": silo["name"],
            "risk_level": crossing["risk_level"],
            "risk_score": crossing["risk_score"],
            "severity": severity_map.get(crossing["risk_level"], "info"),
            "message": message,
            "timestamp": str(alert_row["triggered_at"]),
            "read": False,
            "id": str(alert_row["id"]),
            "triggered_at": str(alert_row["triggered_at"]),
            "kind": "predicted",
            "predicted_for": crossing["predicted_for"].isoformat(),
        })

        try:
            from app.core.push import send_push_to_silo_owner
            await send_push_to_silo_owner(silo_id, "Silo risk forecast", message)
        except Exception as push_err:
            logger.warning("Push notification failed: %s", push_err)
    except Exception as e:
        logger.warning("Predictive alerting failed for silo %s: %s", silo_id, e)