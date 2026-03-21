import asyncio
import asyncpg
import os
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
        ("Gharbia Central Silo", "Gharbia, Nile Delta", 120000),
        ("Kafr El-Sheikh Storage", "Kafr El-Sheikh, Nile Delta", 85000),
        ("Dakahlia Grain Facility", "Dakahlia, Nile Delta", 95000),
        ("Sharqia Depot", "Sharqia, Nile Delta", 75000),
        ("Beheira Storage Unit", "Beheira, Nile Delta", 110000),
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

    sensor_data = [
        (42.0, 85.0, 32.0, 0.15),
        (38.5, 76.0, 28.0, 0.22),
        (25.0, 55.0, 15.0, 0.65),
        (30.0, 68.0, 22.0, 0.45),
        (22.0, 48.0, 12.0, 0.72),
    ]

    for i, silo_id in enumerate(silo_ids):
        temp, hum, soil, ndvi = sensor_data[i]
        await conn.execute(
            """
            INSERT INTO sensor_readings (silo_id, temperature, humidity, soil_moisture, ndvi)
            VALUES ($1, $2, $3, $4, $5)
            """,
            silo_id, temp, hum, soil, ndvi
        )

    alert_data = [
        (silo_ids[0], "high", 95.0, "High spoilage risk in Gharbia Central Silo. Temperature: 42.0°C, Humidity: 85.0%."),
        (silo_ids[1], "high", 75.0, "High spoilage risk in Kafr El-Sheikh Storage. Temperature: 38.5°C, Humidity: 76.0%."),
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
    print(f"Created {len(silo_ids)} silos with sensor readings and alerts.")
    await conn.close()

asyncio.run(seed())
