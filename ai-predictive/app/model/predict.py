def predict_risk(
    temperature: float,
    humidity: float,
    soil_moisture: float,
    ndvi: float,
    pest_damage: float,
    crop_stress_indicator: float,
    soil_ph: float,
    organic_matter: float,
) -> dict:

    score = 0

    if temperature > 40:
        score += 30
    elif temperature > 35:
        score += 20
    elif temperature > 30:
        score += 10

    if humidity > 80:
        score += 25
    elif humidity > 70:
        score += 15
    elif humidity > 60:
        score += 5

    if soil_moisture > 30:
        score += 15
    elif soil_moisture > 20:
        score += 8

    if ndvi < 0.2:
        score += 15
    elif ndvi < 0.4:
        score += 8

    if pest_damage > 70:
        score += 10
    elif pest_damage > 40:
        score += 5

    if crop_stress_indicator > 70:
        score += 10
    elif crop_stress_indicator > 40:
        score += 5

    if soil_ph < 5.5 or soil_ph > 7.5:
        score += 5

    if organic_matter < 0.5:
        score += 5

    score = min(score, 100)

    if score >= 60:
        risk_level = "high"
    elif score >= 30:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {"risk_score": float(score), "risk_level": risk_level}
