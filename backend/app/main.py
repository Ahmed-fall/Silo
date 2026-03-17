from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs on startup
    await init_db()
    yield
    # Runs on shutdown
    await close_db()


app = FastAPI(
    title="Silo API",
    description="Intelligent National Grain & Resource Preservation System",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "backend"}