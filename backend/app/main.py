from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import init_db, close_db
from app.api import silos, sensors, images, alerts, chat, treatments, soil, auth, users, devices, reports
from app.ws.alerts import manager

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(silos.router)
app.include_router(sensors.router)
app.include_router(images.router)
app.include_router(alerts.router)
app.include_router(chat.router)
app.include_router(treatments.router)
app.include_router(soil.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(devices.router)
app.include_router(reports.router)

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


@app.get("/")
async def service_index():
    return {
        "status": "ok",
        "service": "backend",
        "message": "Silo backend is running.",
        "links": {
            "frontend": "http://localhost:3000",
            "backend_docs": "http://localhost:8000/docs",
            "backend_health": "http://localhost:8000/health",
            "ai_vision_health": "http://localhost:8001/health",
            "ai_predictive_health": "http://localhost:8002/health",
            "ai_soil_health": "http://localhost:8003/health",
            "alerts_websocket": "ws://localhost:8000/ws/alerts",
        },
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "backend"}
