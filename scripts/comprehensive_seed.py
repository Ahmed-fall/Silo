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

        # Clear existing data
        print("Clearing existing data...")
        await conn.execute("TRUNCATE silos, sensor_readings, images, alerts RESTART IDENTITY CASCADE")

        # 1. Seed Silos (Showcasing all risk levels and crop types)
        silos_data = [
            ("Texas Terminal", "Houston, TX", 500000.0, "high", "wheat"),
            ("Northern Hub", "Chicago, IL", 750000.0, "medium", "corn"),
            ("Central Valley", "Fresno, CA", 600000.0, "low", "soybeans"),
            ("Coastal Depot", "Savannah, GA", 400000.0, "none", "barley"),
        ]
        
        silo_ids = []
        for name, location, capacity, risk, crop in silos_data:
            sid = await conn.fetchval(
                "INSERT INTO silos (name, location, capacity_kg, risk_level, crop_type) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                name, location, capacity, risk, crop
            )
            silo_ids.append(sid)
            print(f"Inserted silo: {name} ({risk} risk, {crop})")

        # 2. Seed Sensor Readings (48 hours of historical data)
        print("Seeding 48 hours of sensor readings...")
        now = datetime.now()
        for silo_id in silo_ids:
            for i in range(48):
                recorded_at = now - timedelta(hours=i)
                # Realistic fluctuations
                temp = 22 + random.uniform(-4, 10)
                humidity = 55 + random.uniform(-10, 15)
                moisture = 12 + random.uniform(-2, 4)
                ndvi = 0.4 + random.uniform(-0.1, 0.4)
                
                await conn.execute(
                    "INSERT INTO sensor_readings (silo_id, temperature, humidity, soil_moisture, ndvi, recorded_at) VALUES ($1, $2, $3, $4, $5, $6)",
                    silo_id, temp, humidity, moisture, ndvi, recorded_at
                )

        # 3. Seed Alerts (A mix of all levels and read statuses)
        print("Seeding alerts...")
        # Map: (silo_index, risk_level, score, message, is_read)
        alerts_data = [
            (0, "high", 88.5, "CRITICAL: Oxygen levels dropping in Texas Terminal!", False),
            (0, "medium", 62.1, "High temperature spike detected in main chamber.", True),
            (1, "medium", 54.8, "Increased pest activity detected by AI vision.", False),
            (2, "low", 22.4, "Scheduled maintenance required for sensor array B.", False),
            (3, "none", 5.0, "System self-test passed: All parameters nominal.", True),
            (1, "high", 91.2, "CRITICAL: Moisture levels exceeding safety threshold!", False),
        ]
        
        for s_idx, risk, score, msg, read in alerts_data:
            await conn.execute(
                "INSERT INTO alerts (silo_id, risk_level, risk_score, message, is_read) VALUES ($1, $2, $3, $4, $5)",
                silo_ids[s_idx], risk, score, msg, read
            )

        # 4. Seed Images (History of detections)
        print("Seeding AI Vision detection history...")
        detections = [
            (0, "Aphid Detected", 0.94),
            (1, "Moderate Mildew", 0.78),
            (2, "Healthy Wheat", 0.99),
            (3, "Healthy Barley", 0.98),
        ]
        for s_idx, label, conf in detections:
            await conn.execute(
                "INSERT INTO images (silo_id, file_path, detected_label, confidence) VALUES ($1, $2, $3, $4)",
                silo_ids[s_idx], f"uploads/detection_{silo_ids[s_idx]}.jpg", label, conf
            )

        await conn.close()
        print("\nCOMPREHENSIVE SEEDING COMPLETED SUCCESSFULLY!")

    except Exception as e:
        print(f"Error during seeding: {e}")

if __name__ == "__main__":
    asyncio.run(seed())
