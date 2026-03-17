from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.database import init_db, close_db
from app.api import silos


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Silo API",
    description="Intelligent National Grain & Resource Preservation System",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(silos.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "backend"}