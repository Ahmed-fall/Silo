"""One-off backfill: seed ~24h of sensor history per silo at 20-minute
spacing, with explicit recorded_at timestamps.

POST /sensors/ingest always stamps recorded_at = NOW() and cannot backdate,
so at simulate_sensor.py's 20-minute cadence, accumulating real history takes
real hours. This inserts directly with the same bounded random-walk
generator (sensor_walk.py) so charts have something to draw immediately.

Safe to re-run: it only appends new rows, it does not clear existing data.
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone

import asyncpg
from dotenv import load_dotenv

from sensor_walk import new_state, step

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

HOURS_OF_HISTORY = 24
INTERVAL_MINUTES = 20


async def backfill() -> None:
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    dbname = os.getenv("POSTGRES_DB", "silo_db")
    dsn = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

    conn = await asyncpg.connect(dsn)
    try:
        silos = await conn.fetch("SELECT id, name, location FROM silos ORDER BY created_at")
        if not silos:
            print("No silos found - nothing to backfill.")
            return

        now = datetime.now(timezone.utc)
        total_steps = (HOURS_OF_HISTORY * 60) // INTERVAL_MINUTES

        for silo in silos:
            state = new_state(silo["location"])
            rows = []
            # Oldest first so the walk drifts forward naturally into "now".
            for i in range(total_steps, -1, -1):
                ts = now - timedelta(minutes=i * INTERVAL_MINUTES)
                hour_of_day = ts.hour + ts.minute / 60
                reading = step(state, hour_of_day)
                rows.append((
                    silo["id"],
                    reading["temperature"],
                    reading["humidity"],
                    reading["soil_moisture"],
                    reading["ndvi"],
                    ts,
                ))

            await conn.executemany(
                """
                INSERT INTO sensor_readings (silo_id, temperature, humidity, soil_moisture, ndvi, recorded_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                rows,
            )
            print(f"Backfilled {len(rows)} readings for {silo['name']}")

        print("Backfill complete.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(backfill())
