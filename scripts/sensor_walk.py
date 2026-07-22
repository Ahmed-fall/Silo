"""Shared random-walk generator for realistic-looking sensor readings.

Each silo gets its own persistent walk state made of two mean-reverting
(Ornstein-Uhlenbeck-style) components per metric:

- a *fast* component: small per-tick jitter, reverts quickly (sensor noise)
- a *slow* component: drifts over many hours, reverts slowly (weather /
  stress regimes) — this is what occasionally carries a silo into the risk
  band and back out again over a few hours, instead of uniform noise that
  is either permanently extreme or never risky.

Layered on top is a diurnal cycle (temperature peaks mid-afternoon,
humidity inversely).

Band tuning is anchored to the actual ai-predictive model behaviour
(probed empirically): the XGBoost crop-health model is dominated by NDVI —
ndvi >= ~0.6 classifies "Healthy" (low), ~0.4 "Stressed" (medium),
<= ~0.25 "Critical" (high), with soil_moisture < ~10 worsening things.
So ndvi is centred healthy at 0.70 with a slow component wide enough to
occasionally dip toward ~0.45 (medium) and rarely ~0.3 (high).

Used by both simulate_sensor.py (live ingest) and backfill_sensor_history.py
(direct historical insert), so the two produce continuous-looking data.
"""
import math
import random

# center: healthy baseline; amplitude/peak_hour: diurnal swing;
# k_fast/noise_fast: per-tick sensor jitter; k_slow/noise_slow: multi-hour
# regime drift (stationary sd ~= noise_slow / sqrt(2*k_slow));
# lo/hi: hard clamp.
_METRICS = {
    "temperature":   dict(center=24.0, amplitude=4.0,  peak_hour=15, k_fast=0.30, noise_fast=0.25, k_slow=0.01, noise_slow=0.45,  lo=10.0, hi=42.0),
    "humidity":      dict(center=55.0, amplitude=-8.0, peak_hour=15, k_fast=0.30, noise_fast=0.60, k_slow=0.01, noise_slow=0.80,  lo=30.0, hi=95.0),
    "soil_moisture": dict(center=15.0, amplitude=0.0,  peak_hour=15, k_fast=0.30, noise_fast=0.15, k_slow=0.01, noise_slow=0.30,  lo=6.0,  hi=30.0),
    "ndvi":          dict(center=0.70, amplitude=0.0,  peak_hour=15, k_fast=0.30, noise_fast=0.008, k_slow=0.01, noise_slow=0.016, lo=0.20, hi=0.92),
}


# Regional climate: Egypt's interior/south runs hotter and drier than the
# Mediterranean/north coast. Matched by substring against silos.location.
# (temp °C offset, humidity % offset)
_CLIMATE = [
    (("alexandria", "north coast", "matrouh", "marsa", "coast"), (-3.0, +8.0)),
    (("cairo", "giza", "delta"), (+3.0, -4.0)),
    (("luxor", "aswan", "upper egypt", "qena", "sohag", "minya"), (+6.0, -12.0)),
    (("hurghada", "red sea", "suez"), (+2.0, -6.0)),
]


def _climate_offsets(location: str | None) -> tuple[float, float]:
    loc = (location or "").lower()
    for keywords, offsets in _CLIMATE:
        if any(k in loc for k in keywords):
            return offsets
    return (0.0, 0.0)


def new_state(location: str | None = None) -> dict:
    """Fresh zero-offset walk state (fast + slow components) for one silo.
    `location` (the silos.location text) selects a regional climate offset."""
    state = {metric: {"fast": 0.0, "slow": 0.0} for metric in _METRICS}
    state["_climate"] = _climate_offsets(location)
    return state


def step(state: dict, hour_of_day: float, rng: random.Random = random) -> dict:
    """Advance one silo's walk state by one tick and return the new readings.

    `hour_of_day` is a float (e.g. 14.5 for 14:30) driving the diurnal cycle.
    Mutates `state` in place so callers keep it around for the next tick.
    """
    temp_off, hum_off = state.get("_climate", (0.0, 0.0))
    readings = {}
    for metric, cfg in _METRICS.items():
        s = state[metric]
        s["fast"] += -cfg["k_fast"] * s["fast"] + rng.gauss(0, cfg["noise_fast"])
        s["slow"] += -cfg["k_slow"] * s["slow"] + rng.gauss(0, cfg["noise_slow"])
        diurnal = cfg["amplitude"] * math.cos(2 * math.pi * (hour_of_day - cfg["peak_hour"]) / 24)
        regional = temp_off if metric == "temperature" else hum_off if metric == "humidity" else 0.0
        value = cfg["center"] + regional + diurnal + s["fast"] + s["slow"]
        value = max(cfg["lo"], min(cfg["hi"], value))
        readings[metric] = round(value, 2 if metric != "ndvi" else 3)
    return readings
