from pydantic import BaseModel
from typing import List


class TreatmentTier(BaseModel):
    tier: int
    confidence_min: int
    confidence_max: int
    severity_label: str
    treatment: str
    duration: str
    precautions: List[str]


class TreatmentResponse(BaseModel):
    disease: str
    confidence: float
    tier: TreatmentTier
