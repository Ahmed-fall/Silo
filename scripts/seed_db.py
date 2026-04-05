import asyncio
import asyncpg
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Find .env in the root project directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

async def seed():
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    dbname = os.getenv("POSTGRES_DB", "silo_db")
    dsn = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

    try:
        conn = await asyncpg.connect(dsn)
        print("Connected to database.")

        # Clear existing data (optional, but good for fresh seed)
        print("Clearing existing data...")
        await conn.execute("TRUNCATE silos, sensor_readings, images, alerts RESTART IDENTITY CASCADE")

        # 1. Seed Silos
        silos = [
            ("Texas Terminal", "Houston, TX", 500000.0),
            ("Northern Hub", "Chicago, IL", 750000.0),
            ("Central Valley", "Fresno, CA", 600000.0),
        ]
        
        silo_ids = []
        for name, location, capacity in silos:
            sid = await conn.fetchval(
                "INSERT INTO silos (name, location, capacity_kg) VALUES ($1, $2, $3) RETURNING id",
                name, location, capacity
            )
            silo_ids.append(sid)
            print(f"Inserted silo: {name} (ID: {sid})")

        # 2. Seed Sensor Readings (Historical data for last 24 hours)
        print("Seeding sensor readings...")
        now = datetime.now()
        for silo_id in silo_ids:
            for i in range(24):  # Every hour for the last day
                recorded_at = now - timedelta(hours=i)
                temp = 20 + random.uniform(-5, 15)
                humidity = 40 + random.uniform(-10, 20)
                moisture = 10 + random.uniform(-2, 5)
                ndvi = 0.5 + random.uniform(-0.1, 0.3)
                
                await conn.execute(
                    "INSERT INTO sensor_readings (silo_id, temperature, humidity, soil_moisture, ndvi, recorded_at) VALUES ($1, $2, $3, $4, $5, $6)",
                    silo_id, temp, humidity, moisture, ndvi, recorded_at
                )

        # 3. Seed Alerts
        print("Seeding alerts...")
        alert_messages = [
            ("low", 15.5, "Mild temperature fluctuation detected."),
            ("medium", 45.2, "Humidity levels rising above threshold."),
            ("high", 88.7, "CRITICAL: Potential pest detected in Northern Hub!"),
        ]
        
        for i, (level, score, msg) in enumerate(alert_messages):
            silo_id = silo_ids[i % len(silo_ids)]
            await conn.execute(
                "INSERT INTO alerts (silo_id, risk_level, risk_score, message, is_read) VALUES ($1, $2, $3, $4, FALSE)",
                silo_id, level, score, msg
            )

        # 4. Seed Images (References)
        print("Seeding image references...")
        img_labels = ["Healthy Wheat", "Mildew", "Aphid"]
        for i, label in enumerate(img_labels):
            silo_id = silo_ids[i % len(silo_ids)]
            await conn.execute(
                "INSERT INTO images (silo_id, file_path, detected_label, confidence) VALUES ($1, $2, $3, $4)",
                silo_id, f"uploads/sample_{i}.jpg", label, 0.85 + (i * 0.05)
            )

        await conn.close()
        print("Seeding complete successfully!")

    except Exception as e:
        print(f"Error during seeding: {e}")

if __name__ == "__main__":
    asyncio.run(seed())
