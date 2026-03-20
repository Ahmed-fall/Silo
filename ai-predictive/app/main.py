from fastapi import FastAPI
from pydantic import BaseModel
from app.model.predict import predict_risk

app = FastAPI(title="Silo AI Predictive Service")


class SensorInput(BaseModel):
    temperature: float
    humidity: float
    soil_moisture: float
    ndvi: float
    pest_damage: float
    crop_stress_indicator: float
    soil_ph: float
    organic_matter: float


@app.post("/predict")
async def predict(sensor: SensorInput):
    try:
        result = predict_risk(
            temperature=sensor.temperature,
            humidity=sensor.humidity,
            soil_moisture=sensor.soil_moisture,
            ndvi=sensor.ndvi,
            pest_damage=sensor.pest_damage,
            crop_stress_indicator=sensor.crop_stress_indicator,
            soil_ph=sensor.soil_ph,
            organic_matter=sensor.organic_matter,
        )
        return {
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "status": "ok"
        }
    except Exception as e:
        return {"status": "unavailable", "detail": str(e)}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-predictive"}