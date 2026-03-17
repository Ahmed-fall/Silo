from fastapi import FastAPI

app = FastAPI(title="Silo AI Predictive Service")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-predictive"}