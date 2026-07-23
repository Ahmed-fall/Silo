"""Shared crop-risk classifier — single source of truth for "condition".

The XGBoost model weights are loaded in exactly one place: the ai-predictive
service. This module is a thin async client to its /predict endpoint, used
by every backend code path that needs a risk classification:
  - live silo condition in GET /silos, GET /users/me/silos, GET /reports/{id}/pdf
  - real-time alerting in POST /sensors/ingest
  - forecast-point classification in GET /sensors/forecast/{id}

Previously the model was ALSO loaded and re-implemented directly inside the
backend container (duplicate joblib load, duplicate label/score maps,
separate weights volume mount) — meaning live classification (via this HTTP
path) and forecast/condition classification (via the local copy) could
silently drift if only one was ever redeployed after a retrain. Backend no
longer loads the model at all; this is the only place that talks to it.

The model is NDVI-dominant (ndvi >= ~0.6 Healthy, ~0.4 Stressed,
<= ~0.25 Critical; low soil_moisture worsens) — temperature/humidity
barely move it, except a cold-stress band below ~20°C.
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# risk_level -> severity, used everywhere an alert/condition gets a UI badge
# (WS broadcasts, /users/me/alerts, silo condition). One definition instead
# of the three near-identical dicts this used to be copy-pasted as.
SEVERITY_MAP = {"high": "critical", "medium": "warning", "low": "info"}

# Fixed score-per-level convention (matches ai-predictive's own mapping) —
# used when synthesizing a risk_score for a level chosen without a fresh
# model call, e.g. the forecast endpoint's two-point crossing combiner. Not
# a second classifier: nothing here decides *which* level applies.
RISK_TO_SCORE = {"high": 75, "medium": 45, "low": 15}


def _to_float(value, default: float) -> float:
    # Callers pass values from two different sources: Pydantic-validated
    # request bodies (already plain floats) and raw asyncpg rows (NUMERIC
    # columns come back as Decimal, which httpx's JSON encoder can't
    # serialize). Coerce here once so every caller is safe either way.
    return float(value) if value is not None else default


async def classify(temperature, humidity, soil_moisture, ndvi) -> dict | None:
    """Classify one reading via the ai-predictive service. Missing fields
    fall back to the same neutral defaults the service itself expects.
    Returns {risk_level, risk_score} or None if the service is unreachable
    or returns a non-ok status — callers already treat "no classification"
    as "skip this signal", so this fails soft rather than raising."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.ai_predictive_url}/predict",
                json={
                    "temperature": _to_float(temperature, 25.0),
                    "humidity": _to_float(humidity, 60.0),
                    "soil_moisture": _to_float(soil_moisture, 20.0),
                    "ndvi": _to_float(ndvi, 0.5),
                },
                timeout=5.0,
            )
            result = response.json()
            if result.get("status") != "ok":
                return None
            return {"risk_level": result["risk_level"], "risk_score": result["risk_score"]}
    except Exception as e:
        logger.warning("Risk classification unavailable: %s", e)
        return None
