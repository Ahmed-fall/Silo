from fastapi import APIRouter, HTTPException, UploadFile, File
from app.core.config import settings
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/soil", tags=["soil"])


@router.post("/analyze")
async def analyze_soil(file: UploadFile = File(...)):
    contents = await file.read()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.ai_soil_url}/analyze",
                files={"file": (file.filename, contents, file.content_type)},
                timeout=10.0,
            )
            response.raise_for_status()
            result = response.json()

            if result.get("status") != "ok":
                raise HTTPException(
                    status_code=502,
                    detail=result.get("detail", "Soil AI service returned an invalid response"),
                )

            return {
                "label": result.get("label"),
                "confidence": result.get("confidence"),
                "status": "ok",
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Soil service unavailable: {e}")
        raise HTTPException(status_code=503, detail="Soil AI service unavailable")
