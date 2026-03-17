from fastapi import FastAPI

app = FastAPI(title="Silo AI Vision Service")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-vision"}