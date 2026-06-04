# 🌾 Silo
### النظام الذكي للحفاظ على الحبوب الوطنية
### Intelligent National Grain Preservation System

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.17-FF6F00?style=for-the-badge&logo=tensorflow)](https://tensorflow.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0-brightgreen?style=for-the-badge)](https://xgboost.readthedocs.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)](https://docker.com/)
[![Ollama](https://img.shields.io/badge/Ollama-LLaMA_3.1-white?style=for-the-badge)](https://ollama.com/)

**Egypt loses 30–40% of its grain every year to spoilage, disease, and poor storage conditions.**
**Silo is the early warning system that changes that.**

[Features](#features) · [Architecture](#architecture) · [Quick Start](#quick-start) · [Docker](#docker) · [API Reference](#api-reference) · [Team](#team)

</div>

---

## What is Silo?

Silo is an enterprise-grade, AI-powered grain silo management platform built for national agricultural operators. It unifies **live sensor telemetry**, **AI grain disease diagnostics**, **soil health analysis**, **predictive risk scoring**, **geospatial monitoring**, and a **conversational AI agronomist** into a single command center for Egyptian grain storage facilities.

> **Mission:** Transform raw silo data into actionable intelligence — before spoilage, pest infestations, or environmental hazards cause irreversible loss.

---

## Features

### 🖥️ Command Center Dashboard
Real-time overview of all monitored silos with animated risk-reactive cards. Each card shows live temperature, humidity, risk level, and crop type. A stats row at the top displays total silos, at-risk count, and nominal count at a glance. Falls back to realistic mock data if the backend is offline — presentations never crash.

### 🗺️ Geospatial Command Map
Interactive SVG map of Egypt plotting every silo's live risk status. 30+ Egyptian governorate coordinates are calibrated manually. Each silo appears as a color-coded pulsing node — Turquoise (Nominal), Bronze (Medium), Red (Critical) — with pulse speed increasing with risk severity. Click any node to open a slide-over detail drawer without leaving the map.

### 🏭 Silo Diagnostics Page
Per-silo full diagnostic view including: animated risk badge, live sensor widgets (temperature, humidity, fill percentage), 24-hour sensor history chart with 12-hour AI forecast overlay, thermal digital twin cylinder, alert history, AI vision scanner, and a PDF report export button.

### 📈 Sensor History & AI Forecast Chart
Dual-line Recharts chart showing temperature and humidity history with SVG gradient strokes. A dashed 12-hour AI forecast overlay extends from the last reading using XGBoost trend-adjusted extrapolation. Custom tooltip distinguishes historical readings from AI predictions with a 🔮 badge.

### 🤖 AI Vision — Grain Disease Detection
Drag-and-drop grain image upload with laser scanning animation. The TensorFlow/Keras CNN classifies the image across 14 disease categories and returns a detected label with confidence score. Results are stored per silo with full history.

**14 disease classes:** Aphid, Black Rust, Blast, Brown Rust, Fusarium Head Blight, Healthy Wheat, Leaf Blight, Mildew, Mite, Septoria, Smut, Stem Fly, Tan Spot, Yellow Rust

### 🌱 AI Soil Analysis
Dedicated soil health analysis service. Upload a soil image from the Soil Analysis page and receive an AI-powered classification of soil health status. Accessible directly from the sidebar navigation.

### 💊 Disease Treatment Protocols
Full treatment guide for every detectable disease. The Diseases page presents tiered treatment protocols — what the disease is, severity level, and exactly what action to take. Treatments are searchable and expandable by tier. Directly connected to the AI Vision detection flow.

### 💬 AI Agronomist Chatbot
Floating chat assistant powered by LLaMA 3.1 (via Ollama). Before every message, the backend queries the live silos database and injects current silo states into the system prompt — giving the model real context about your actual facility. Supports multi-turn conversation with full history. Quick suggestion chips on first open.

### ⚡ Real-Time Alert System
WebSocket-powered live alert broadcasting. When a high-risk sensor reading is ingested, the backend automatically creates an alert and pushes it to every connected operator simultaneously. A morphing Dynamic Island pill at the top of every page shows live alerts. Auto-reconnects with 5-second retry if connection drops.

### 📄 PDF Report Export
Every silo diagnostics page exports as a clean, print-ready A4 report via `window.print()` with full print CSS overrides. Useful for government inspectors and agricultural supervisors who need physical documentation.

### ⚙️ Settings & Compact Mode
Slide-over settings panel with compact grid mode toggle and alert mute toggle. All settings applied instantly via React Context with no page reload.

---

## Architecture

```
Browser (Next.js 16.2 + TypeScript)
         │
         ├── REST (Axios, 2s timeout)
         ├── WebSocket (/ws/alerts)
         └── POST /chat
              │
        ┌─────▼──────────────────────────────┐
        │     FastAPI Backend (:8000)         │
        │     asyncpg · Alembic · Pydantic v2 │
        └─────┬──────────────────────────────┘
              │
    ┌─────────┼──────────────────────┐
    │         │                      │
    ▼         ▼                      ▼
PostgreSQL  AI Vision (:8001)   AI Predictive (:8002)
(silo_db)   TensorFlow/Keras    XGBoost Classifier
            14-class CNN        89% accuracy
                                      │
                             AI Soil (:8003)
                             Soil Health Classifier
                                      │
                             Ollama LLM (:11434)
                             LLaMA 3.1 8B
```

All frontend requests route exclusively through the FastAPI backend. The frontend never communicates directly with the database, AI services, or Ollama.

---

## Services

| Service | Port | Technology | Responsibility |
|---|---|---|---|
| Frontend | 3000 | Next.js 16.2, TypeScript, Tailwind CSS v4, Framer Motion | UI, WebSocket client, AI chat |
| Backend | 8000 | FastAPI, asyncpg, Alembic, Pydantic v2, httpx | API gateway, DB, WebSocket hub, AI orchestration |
| AI Vision | 8001 | TensorFlow 2.17, Keras | 14-class grain disease image classification |
| AI Predictive | 8002 | XGBoost, scikit-learn, joblib | Sensor-based risk scoring and forecast |
| AI Soil | 8003 | FastAPI, PyTorch | Soil health image classification |
| Database | 5432 | PostgreSQL 15+ | Persistent storage — silos, sensors, alerts, images |
| Ollama | 11434 | LLaMA 3.1 8B | Conversational AI agronomist with live DB context |

---

## AI Models

### AI Vision — Grain Disease Classifier
| Property | Detail |
|---|---|
| Framework | TensorFlow 2.17 / Keras CNN |
| Input | 255×255 RGB image, normalized to [0,1] |
| Validation Accuracy | 78.22% |
| Classes | 14 (Aphid, Black Rust, Blast, Brown Rust, Fusarium Head Blight, Healthy Wheat, Leaf Blight, Mildew, Mite, Septoria, Smut, Stem Fly, Tan Spot, Yellow Rust) |
| Training Dataset | Kaggle Wheat Disease Dataset |

### AI Predictive — Risk Scorer
| Property | Detail |
|---|---|
| Framework | XGBoost + scikit-learn Pipeline |
| Input Features | Temperature, Humidity, Soil Moisture, NDVI |
| Test Accuracy | 89% |
| Cross-Validation | 5-fold mean 90.4%, std 0.0047 |
| Output | Critical → high (score 75), Stressed → medium (45), Healthy → low (15) |
| Inference Latency | 60ms end-to-end |

### AI Chatbot
| Property | Detail |
|---|---|
| Engine | Ollama (local inference) |
| Default Model | llama3.1:8b |
| Pattern | RAG-lite — live silo DB state injected into system prompt per query |
| Timeout | 120 seconds |

---

## Quick Start

### Prerequisites
- Python 3.11
- Node.js v20+
- PostgreSQL 15+
- [Ollama](https://ollama.com/download)
- conda / mamba

### 1. Clone

```bash
git clone https://github.com/Ahmed-fall/Silo.git
cd Silo
```

### 2. Python environment

```bash
mamba create -n silo python=3.11 -y
mamba activate silo

pip install fastapi==0.111.0 uvicorn[standard]==0.29.0 asyncpg==0.29.0 \
    pydantic==2.7.1 pydantic-settings==2.2.1 python-dotenv==1.0.1 \
    httpx==0.27.0 python-multipart==0.0.9 alembic==1.13.1 \
    psycopg2-binary==2.9.9 email-validator==2.3.0 \
    tensorflow==2.17.0 keras==3.13.2 pillow==10.4.0 \
    xgboost scikit-learn joblib numpy==1.26.4 requests websockets
```

### 3. Frontend

```bash
cd frontend && npm install && cd ..
```

### 4. Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:

```env
POSTGRES_USER=silo_user
POSTGRES_PASSWORD=silo_pass
POSTGRES_DB=silo_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
AI_VISION_URL=http://localhost:8001
AI_PREDICTIVE_URL=http://localhost:8002
AI_SOIL_URL=http://localhost:8003
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
UPLOADS_DIR=/absolute/path/to/Silo/uploads
```

### 5. PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER silo_user WITH PASSWORD 'silo_pass';"
sudo -u postgres psql -c "CREATE DATABASE silo_db OWNER silo_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE silo_db TO silo_user;"
sudo -u postgres psql -d silo_db -c "GRANT ALL ON SCHEMA public TO silo_user;"

cd backend && alembic upgrade head && cd ..
```

### 6. Ollama

```bash
OLLAMA_HOST=0.0.0.0 ollama serve &
ollama pull llama3.1:8b
```

### 7. Model files

Place these manually (not tracked in Git due to size):

```
ai-vision/app/Final_model.keras
ai-predictive/app/model/weights/crop_health_model_xgb.pkl
ai-predictive/app/model/weights/label_encoder.pkl
ai-soil/app/model/weights/<your-soil-model>.pth
```

### 8. Seed & run

```bash
python scripts/seed_data.py
```

Open 6 terminals:

```bash
# Terminal 1 — Backend
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --env-file ../.env

# Terminal 2 — AI Vision
cd ai-vision && uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3 — AI Predictive
cd ai-predictive && uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload

# Terminal 4 — AI Soil
cd ai-soil && uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload

# Terminal 5 — Frontend
cd frontend && npm run dev

# Terminal 6 — Sensor Simulator (optional)
python scripts/simulate_sensor.py
```

Open **http://localhost:3000**

---

## Docker

The entire stack runs with one command:

```bash
docker compose up --build
```

> **Note:** Ollama runs on the host machine. Start it before running Docker:
> ```bash
> OLLAMA_HOST=0.0.0.0 ollama serve &
> ```
> On Linux, the Docker network gateway is typically `172.18.0.1`. The `docker-compose.yml` is configured to reach Ollama at that address.

Run migrations and seed after first startup:

```bash
docker compose exec backend alembic upgrade head
# Seed from host machine:
POSTGRES_HOST=localhost python scripts/seed_data.py
```

Useful commands:

```bash
docker compose up --build        # Build and start everything
docker compose up -d             # Run in background
docker compose logs backend      # View backend logs
docker compose logs ai-predictive
docker compose down              # Stop everything
docker compose down -v           # Stop and delete database volume
```

---

## Verify All Services

```bash
curl http://localhost:8000/health   # {"status":"ok","service":"backend"}
curl http://localhost:8001/health   # {"status":"ok","service":"ai-vision"}
curl http://localhost:8002/health   # {"status":"ok","service":"ai-predictive"}
curl http://localhost:8003/health   # {"status":"ok","service":"ai-soil"}
curl http://localhost:11434/api/tags  # Ollama model list
```

---

## API Reference

Base URL: `http://localhost:8000`

### Silos
| Method | Endpoint | Description |
|---|---|---|
| GET | `/silos` | List all silos with latest sensor and risk data |
| GET | `/silos/{id}` | Get single silo detail |
| POST | `/silos` | Create a new silo |

### Sensors
| Method | Endpoint | Description |
|---|---|---|
| POST | `/sensors/ingest` | Ingest reading → AI prediction → alert if high risk → WebSocket broadcast |
| GET | `/sensors/{silo_id}` | Get sensor history |
| GET | `/sensors/forecast/{silo_id}` | Get 12-hour AI forecast |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/alerts/{silo_id}` | List alerts for a silo |
| PATCH | `/alerts/{alert_id}/read` | Mark alert as read |

### Images & Vision
| Method | Endpoint | Description |
|---|---|---|
| POST | `/images/upload?silo_id={id}` | Upload grain image → AI disease classification |
| GET | `/images/{silo_id}` | Get image scan history |

### Soil Analysis
| Method | Endpoint | Description |
|---|---|---|
| POST | `/soil/analyze` | Upload soil image → AI soil health classification |

### Treatments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/treatments` | Get all disease treatment protocols |
| GET | `/treatments/{disease}` | Get treatment protocol for a specific disease |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat` | Send message to AI agronomist (live DB context injected) |

### WebSocket
| Channel | URL | Description |
|---|---|---|
| Alerts | `ws://localhost:8000/ws/alerts` | Real-time alert push to all connected clients |

---

## Project Structure

```
Silo/
├── .env                              # Environment config (not in Git)
├── .env.example                      # Environment template
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py                   # FastAPI app, CORS, WebSocket, health
│   │   ├── api/
│   │   │   ├── silos.py
│   │   │   ├── sensors.py            # Ingest pipeline + forecast
│   │   │   ├── alerts.py
│   │   │   ├── images.py
│   │   │   ├── treatments.py         # Disease treatment protocols
│   │   │   └── chat.py               # Ollama + live DB context
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── data/
│   │   │   └── treatment_protocols.py  # 14-disease treatment data
│   │   ├── models/
│   │   │   ├── silo.py
│   │   │   ├── sensor.py
│   │   │   ├── alert.py
│   │   │   ├── image.py
│   │   │   └── treatment.py
│   │   └── ws/alerts.py
│   ├── migrations/
│   └── requirements.txt
├── ai-vision/
│   ├── app/
│   │   ├── main.py
│   │   └── Final_model.keras         # Not in Git — place manually
│   └── requirements.txt
├── ai-predictive/
│   ├── app/
│   │   ├── main.py
│   │   └── model/
│   │       ├── predict.py
│   │       └── weights/
│   │           ├── crop_health_model_xgb.pkl   # Not in Git
│   │           └── label_encoder.pkl           # Not in Git
│   └── requirements.txt
├── ai-soil/
│   ├── app/
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx                  # Command Center Dashboard
│   │   ├── live-map/page.tsx         # Geospatial Command Map
│   │   ├── silos/[id]/page.tsx       # Silo Diagnostics
│   │   ├── diseases/page.tsx         # Disease Treatment Protocols
│   │   └── soil-analysis/page.tsx    # Soil Analysis
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── SiloCard.tsx
│   │   ├── SensorChart.tsx
│   │   ├── ThermalSiloMap.tsx
│   │   ├── AIVisionScanner.tsx
│   │   ├── AISoilScanner.tsx
│   │   ├── LiveAlertsPanel.tsx
│   │   ├── ChatBot.tsx
│   │   ├── SettingsDrawer.tsx
│   │   ├── SplashScreen.tsx
│   │   └── WheatParallaxField.tsx
│   ├── context/
│   │   ├── AlertContext.tsx
│   │   └── SettingsContext.tsx
│   └── lib/api.ts
└── scripts/
    ├── seed_data.py
    └── simulate_sensor.py
```

---

## Known Limitations

- No authentication — all endpoints are publicly accessible
- No rate limiting on sensor ingestion or image upload
- Chatbot responds in English only
- Model files must be placed manually (not tracked in Git due to size)
- Ollama requires separate host setup — not containerized

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `permission denied for table alembic_version` | PostgreSQL 15+ schema permissions | Run `GRANT ALL ON SCHEMA public TO silo_user;` |
| Backend can't connect to DB in Docker | `POSTGRES_HOST=localhost` in `.env` | Override with `POSTGRES_HOST=db` in docker-compose.yml environment |
| Ollama unreachable from Docker on Linux | `host.docker.internal` not supported on Linux | Use gateway IP `172.18.0.1` and allow firewall: `sudo ufw allow from 172.18.0.0/16 to any port 11434` |
| Frontend exits silently | Corrupt `node_modules` | `rm -rf node_modules && npm install` |
| `Module not found: sklearn` | Missing dependency | `pip install scikit-learn xgboost` |
| Port already in use | Previous service still running | `sudo fuser -k 8000/tcp` (replace port as needed) |

---

## Team

Built by the Silo Engineering Team
**Egypt-Japan University of Science and Technology (E-JUST)**
Supported by [nWeave](http://nweave.com)

---

<div align="center">
Built for Egypt. By Egyptian engineers.
</div>
READMEEOF
echo "Done"
