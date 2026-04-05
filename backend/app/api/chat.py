from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import os

router = APIRouter(prefix="/chat", tags=["chat"])

# Read the OLLAMA_URL from the environment variables
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")

class ChatRequest(BaseModel):
    message: str
    model: str = "llama3.2"  # Using the model you just downloaded!

@router.post("/")
async def chat_with_assistant(request: ChatRequest):
    try:
        # Call the local Ollama instance
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": request.model,
                    "prompt": f"You are a helpful agricultural AI assistant for the Silo app. Answer this briefly and clearly: {request.message}",
                    "stream": False
                },
                timeout=60.0  # Give the LLM a minute to think
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to communicate with Ollama")
                
            data = response.json()
            return {"reply": data.get("response", "No response generated.")}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama connection error: {str(e)}")