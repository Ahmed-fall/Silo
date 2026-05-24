import asyncio
import asyncpg
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

async def seed():
    conn = await asyncpg.connect(
        user=os.environ['POSTGRES_USER'],
        password=os.environ['POSTGRES_PASSWORD'],
        database=os.environ['POSTGRES_DB'],
        host=os.environ['POSTGRES_HOST'],
        port=int(os.environ['POSTGRES_PORT']),
    )

    await conn.execute("DELETE FROM alerts")
    await conn.execute("DELETE FROM images")
    await conn.execute("DELETE FROM sensor_readings")
    await conn.execute("DELETE FROM silos")

    silos = [
        ("Gharbia Central Silo",    "Gharbia, Nile Delta",    120000),
        ("Kafr El-Sheikh Storage",  "Kafr El-Sheikh, Nile Delta", 85000),
        ("Dakahlia Grain Facility", "Dakahlia, Nile Delta",    95000),
        ("Sharqia Depot",           "Sharqia, Nile Delta",     75000),
        ("Beheira Storage Unit",    "Beheira, Nile Delta",    110000),
    ]

    # Base conditions per silo: (temp, humidity, soil_moisture, ndvi)
    # First two are high risk, third is medium, last two are healthy
    base_conditions = [
        (42.0, 85.0, 32.0, 0.15),  # Gharbia   - high risk
        (38.5, 76.0, 28.0, 0.22),  # Kafr      - high risk
        (30.0, 68.0, 22.0, 0.45),  # Dakahlia  - medium risk
        (28.0, 62.0, 18.0, 0.55),  # Sharqia   - nominal
        (22.0, 48.0, 12.0, 0.72),  # Beheira   - nominal
    ]

    silo_ids = []
    for name, location, capacity in silos:
        row = await conn.fetchrow(
            """
            INSERT INTO silos (name, location, capacity_kg)
            VALUES ($1, $2, $3)
            RETURNING id
            """,
            name, location, capacity
        )
        silo_ids.append(row['id'])
        print(f"Created silo: {name}")

    # 30 readings per silo over the last 7 days
    now = datetime.utcnow()
    for i, silo_id in enumerate(silo_ids):
        base_temp, base_hum, base_soil, base_ndvi = base_conditions[i]
        for j in range(30):
            # Spread readings evenly over 7 days
            recorded_at = now - timedelta(hours=(7 * 24 / 30) * (30 - j))

            # Add realistic noise
            temp  = round(base_temp  + random.uniform(-2.0,  2.0), 1)
            hum   = round(base_hum   + random.uniform(-5.0,  5.0), 1)
            soil  = round(base_soil  + random.uniform(-3.0,  3.0), 1)
            ndvi  = round(base_ndvi  + random.uniform(-0.05, 0.05), 2)
            ndvi  = max(0.01, min(0.99, ndvi))  # clamp between 0 and 1

            await conn.execute(
                """
                INSERT INTO sensor_readings
                    (silo_id, temperature, humidity, soil_moisture, ndvi, recorded_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                silo_id, temp, hum, soil, ndvi, recorded_at
            )

        print(f"  → 30 readings created for silo {i+1}")

    # Alerts for the two high-risk silos
    alert_data = [
        (silo_ids[0], "high",   95.0, "High spoilage risk in Gharbia Central Silo. Temperature: 42.0°C, Humidity: 85.0%."),
        (silo_ids[1], "high",   75.0, "High spoilage risk in Kafr El-Sheikh Storage. Temperature: 38.5°C, Humidity: 76.0%."),
        (silo_ids[2], "medium", 35.0, "Medium spoilage risk in Dakahlia Grain Facility. Temperature: 30.0°C, Humidity: 68.0%."),
    ]

    for silo_id, risk_level, risk_score, message in alert_data:
        await conn.execute(
            """
            INSERT INTO alerts (silo_id, risk_level, risk_score, message)
            VALUES ($1, $2, $3, $4)
            """,
            silo_id, risk_level, risk_score, message
        )

    print("\nSeed data created successfully.")
    print(f"  {len(silo_ids)} silos")
    print(f"  {len(silo_ids) * 30} sensor readings")
    print(f"  {len(alert_data)} alerts")
    await conn.close()

asyncio.run(seed())