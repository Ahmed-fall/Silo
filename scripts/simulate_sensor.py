import requests
import time
import random

SILOS = [
    "0d9be542-762d-4bfc-a357-bd741aafbc86",
    "b0788a86-d8a4-4260-b30a-16ba27d1c89c",
]

while True:
    silo_id = random.choice(SILOS)
    temp = round(random.uniform(38, 44), 1)
    humidity = round(random.uniform(75, 90), 1)
    soil = round(random.uniform(25, 35), 1)
    ndvi = round(random.uniform(0.10, 0.20), 2)

    response = requests.post(
        "http://localhost:8000/sensors/ingest",
        json={
            "silo_id": silo_id,
            "temperature": temp,
            "humidity": humidity,
            "soil_moisture": soil,
            "ndvi": ndvi,
        }
    )
    print(f"Ingested sensor: temp={temp}, humidity={humidity} → {response.status_code}")
    time.sleep(10)
