from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import httpx
import os
import logging
from app.core.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# Configurable via environment variables - defaults for backwards compatibility
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

class ChatRequest(BaseModel):
    message: str
    model: str | None = None  # None means use the default from .env
    history: List[Dict[str, Any]] = []  # We now accept history!

@router.post("/")
async def chat_with_assistant(request: ChatRequest):
    # Use request model if provided, otherwise fall back to .env default
    model_name = request.model or OLLAMA_MODEL
    
    try:
        db = await get_db()
        rows = await db.fetch(
            """
            SELECT s.name, s.location, sr.temperature, sr.humidity, a.risk_level
            FROM silos s
            LEFT JOIN LATERAL (
                SELECT temperature, humidity FROM sensor_readings WHERE silo_id = s.id ORDER BY recorded_at DESC LIMIT 1
            ) sr ON true
            LEFT JOIN LATERAL (
                SELECT risk_level FROM alerts WHERE silo_id = s.id ORDER BY triggered_at DESC LIMIT 1
            ) a ON true
            """
        )

        silo_context = "--- LIVE SILO DATABASE ---\n"
        if not rows:
            silo_context += "The user currently has NO SILOS in the database.\n"
        else:
            for row in rows:
                name = row.get("name", "Unknown Silo")
                loc = row.get("location", "Unknown Location")
                temp = row.get("temperature")
                hum = row.get("humidity")
                risk = row.get("risk_level")

                temp_str = f"{temp}°C" if temp else "N/A"
                hum_str = f"{hum}%" if hum else "N/A"
                risk_str = risk.upper() if risk else "None"

                silo_context += f"Silo Name: {name} | Location: {loc} | Temp: {temp_str} | Humidity: {hum_str} | Risk: {risk_str}\n"

        # 1. Create the System Instructions
        system_message = {
            "role": "system",
            "content": f"""You are the Silo Assistant, an expert AI agronomist built specifically to prevent crop spoilage in Egypt.
You MUST provide detailed agricultural advice and NEVER refuse a farming question.

Here is the LIVE SILO DATABASE for the user:
{silo_context}

CRITICAL KNOWLEDGE BASE (USE THIS TO ANSWER QUESTIONS):
- WHEAT & CORN TEMPERATURES: Safe storage is below 15°C. Warning zone is 20°C - 25°C (insects start breeding). CRITICAL DANGER is 30°C - 40°C (rapid insect growth, weevils, fungi, and grain sweating).
- MOISTURE & HUMIDITY: Safe is 12-13%. Critical Danger is above 14.5% (triggers Aspergillus mold and deadly Aflatoxins).
- EGYPTIAN CLIMATE: The Nile Delta (Kafr El-Sheikh, Alexandria) has high humidity causing mold. Upper Egypt (Aswan, Luxor) is extremely hot and dry causing grain weight loss.
- ACTIONABLE ADVICE: If temperatures or humidity are high, advise the user to immediately turn on aeration fans, check for "hot spots", or fumigate for insects.

STRICT RULES:
1. If the user asks if a temperature is safe (e.g., 37°C), you MUST use the Knowledge Base above to explain why it is dangerous and tell them what to do.
2. Answer confidently as an expert. NEVER say "I don't have information" or "I cannot provide guidance." You literally have the guidance right here.
3. Use Markdown (bolding and bullet points) to make your warnings easy to read.
"""
        }
        # 2. Build the full conversation history
        messages = [system_message]

        # Add all previous messages from the frontend
        for msg in request.history:
            if msg.get("role") in ["user", "assistant"]:
                messages.append({"role": msg["role"], "content": msg["content"]})

        # Add the brand new user message
        messages.append({"role": "user", "content": request.message})

        # 3. Call Ollama using the /api/chat endpoint
        async with httpx.AsyncClient(timeout=120.0) as client:
            ollama_endpoint = f"{OLLAMA_URL}/api/chat"
            logger.info("Calling Ollama: %s with model: %s", ollama_endpoint, model_name)

            response = await client.post(
                ollama_endpoint,
                json={
                    "model": model_name,
                    "messages": messages,
                    "stream": False
                }
            )

            if response.status_code == 404:
                raise HTTPException(
                    status_code=500,
                    detail=f"Model '{model_name}' not found. Please pull it with: ollama pull {model_name}"
                )
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"Ollama error (HTTP {response.status_code}): {response.text}"
                )

            data = response.json()
            reply = data.get("message", {}).get("content", "No response generated.")
            logger.info("Ollama response received (%d chars)", len(reply))
            return {"reply": reply, "model": model_name}

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to Ollama at {OLLAMA_URL}. Is Ollama running? Start with: ollama serve"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Chat error: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Ollama connection error: {str(e)}")