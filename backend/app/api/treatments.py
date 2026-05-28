from fastapi import APIRouter, HTTPException, Query
from app.models.treatment import TreatmentResponse
from app.data.treatment_protocols import TREATMENT_PROTOCOLS
from typing import Dict, List, Any

router = APIRouter(prefix="/treatments", tags=["treatments"])


@router.get("/all", response_model=Dict[str, List[Any]])
async def get_all_protocols():
    return TREATMENT_PROTOCOLS


@router.get("/protocol", response_model=TreatmentResponse)
async def get_treatment_protocol(
    disease: str = Query(..., description="Detected disease label from AI Vision"),
    confidence: float = Query(..., ge=0.0, le=1.0, description="Confidence score 0–1"),
):
    tiers = TREATMENT_PROTOCOLS.get(disease)
    if tiers is None:
        raise HTTPException(status_code=404, detail=f"No treatment protocol found for: {disease}")

    confidence_pct = confidence * 100
    matched = tiers[-1]
    for tier in tiers:
        if tier["confidence_min"] <= confidence_pct < tier["confidence_max"]:
            matched = tier
            break

    return TreatmentResponse(disease=disease, confidence=confidence, tier=matched)
