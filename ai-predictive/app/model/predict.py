import joblib
import numpy as np
import os

# Load once at startup
_dir = os.path.dirname(__file__)
_model = joblib.load(os.path.join(_dir, "weights/crop_health_model_xgb.pkl"))
_encoder = joblib.load(os.path.join(_dir, "weights/label_encoder.pkl"))

# Map label → risk_level your API already uses
_LABEL_TO_RISK = {
    "Critical": "high",
    "Healthy":  "low",
    "Stressed": "medium"
}

# Map risk_level → score 0-100
_RISK_TO_SCORE = {
    "high":   75,
    "medium": 45,
    "low":    15
}

def predict_risk(temperature, humidity, soil_moisture, ndvi):
    features = np.array([[temperature, humidity, soil_moisture, ndvi]])

    prediction = _model.predict(features)[0]
    label = _encoder.inverse_transform([prediction])[0]  # "Critical" / "Healthy" / "Stressed"

    risk_level = _LABEL_TO_RISK[label]
    risk_score = _RISK_TO_SCORE[risk_level]

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "status": "ok"
    }