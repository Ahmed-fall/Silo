import requests
import time
import random

# Dynamic fetching of silo IDs from backend
try:
    print("Fetching active silo IDs from backend...")
    response = requests.get("http://localhost:8000/silos", timeout=5)
    if response.status_code == 200:
        silos_data = response.json()
        SILOS = [silo["id"] for silo in silos_data]
        print(f"Fetched {len(SILOS)} active silos: {SILOS}")
    else:
        SILOS = []
except Exception as e:
    print(f"Failed to fetch silos from backend: {e}")
    SILOS = []

# Fallback to the known real database IDs if the list is empty
if not SILOS:
    SILOS = [
        "51d0c0b0-f737-460d-8dd6-3e8915a98e0b",
        "a8710b72-b15c-48bc-865f-5aafb322b19a",
        "d9869af7-511c-4879-bb6f-c937f4e968d4",
    ]
    print(f"Using fallback database silo IDs: {SILOS}")

while True:
    silo_id = random.choice(SILOS)
    temp = round(random.uniform(38, 44), 1)
    humidity = round(random.uniform(75, 90), 1)
    soil = round(random.uniform(25, 35), 1)
    ndvi = round(random.uniform(0.10, 0.20), 2)

    try:
        response = requests.post(
            "http://localhost:8000/sensors/ingest",
            json={
                "silo_id": silo_id,
                "temperature": temp,
                "humidity": humidity,
                "soil_moisture": soil,
                "ndvi": ndvi,
            },
            timeout=5
        )
        print(f"Ingested sensor: temp={temp}, humidity={humidity} → {response.status_code}")
    except Exception as e:
        print(f"Failed to ingest sensor: {e}")
    time.sleep(10)

