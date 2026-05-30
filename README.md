# 🌾 Silo — Intelligent National Grain Preservation System

An enterprise-grade, AI-powered platform that unifies live sensor telemetry, grain disease diagnostics, predictive risk scoring, geospatial monitoring, and a conversational AI agronomist into a single command center for Egyptian grain storage facilities.

---

## Architecture

```
Browser (Next.js 16.2)
    │
    ├── REST (Axios)
    ├── WebSocket (/ws/alerts)
    └── POST /chat
         │
    FastAPI Backend (:8000)
         │
    ┌────┴──────────────────────┐
    │                           │
PostgreSQL              AI Vision (:8001)
(silo_db)               TensorFlow/Keras
                        14-class CNN
                                │
                        AI Predictive (:8002)
                        XGBoost Classifier
                                │
                        Ollama LLM (:11434)
                        llama3.1:8b
```

All frontend requests route exclusively through the FastAPI backend. The frontend never communicates directly with the database, AI services, or Ollama.

---

## Services

| Service | Port | Technology | Responsibility |
|---|---|---|---|
| Frontend | 3000 | Next.js 16.2, TypeScript, Tailwind CSS v4 | UI, WebSocket client, chat |
| Backend | 8000 | FastAPI, asyncpg, Alembic, Pydantic v2 | API gateway, DB, WebSocket hub |
| AI Vision | 8001 | TensorFlow 2.17, Keras | 14-class grain disease classification |
| AI Predictive | 8002 | XGBoost, scikit-learn | Sensor-based risk scoring |
| Database | 5432 | PostgreSQL 15+ | Persistent storage |
| Ollama | 11434 | llama3.1:8b | Conversational AI agronomist |

---

## Prerequisites

- Python 3.11
- Node.js v20+
- PostgreSQL 15+
- [Ollama](https://ollama.com/download)
- conda / mamba (recommended)
- Model files (see Model Files section below)

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/Ahmed-fall/Silo.git
cd Silo
```

### 2. Create Python environment

```bash
mamba create -n silo python=3.11 -y
mamba activate silo
```

### 3. Install Python dependencies

```bash
pip install fastapi==0.111.0 uvicorn[standard]==0.29.0 asyncpg==0.29.0 \
    pydantic==2.7.1 pydantic-settings==2.2.1 python-dotenv==1.0.1 \
    httpx==0.27.0 python-multipart==0.0.9 alembic==1.13.1 \
    psycopg2-binary==2.9.9 email-validator==2.3.0 \
    tensorflow==2.17.0 keras==3.13.2 pillow==10.4.0 \
    xgboost scikit-learn joblib numpy==1.26.4 requests websockets
```

### 4. Install Node.js dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values. Required variables:

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
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
UPLOADS_DIR=/absolute/path/to/Silo/uploads
```

### 6. Set up PostgreSQL

```bash
sudo -u postgres psql -c "CREATE USER silo_user WITH PASSWORD 'silo_pass';"
sudo -u postgres psql -c "CREATE DATABASE silo_db OWNER silo_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE silo_db TO silo_user;"
sudo -u postgres psql -d silo_db -c "GRANT ALL ON SCHEMA public TO silo_user;"
```

Run migrations:

```bash
cd backend
alembic upgrade head
cd ..
```

Verify tables exist:

```bash
psql -U silo_user -d silo_db -h localhost -c "\dt"
```

You should see: `alerts`, `images`, `sensor_readings`, `silos`.

### 7. Set up Ollama

```bash
ollama serve &
ollama pull llama3.1:8b
```

### 8. Place model files

Model files are not tracked in Git. Place them manually:

```
ai-vision/app/Final_model.keras
ai-predictive/app/model/weights/crop_health_model_xgb.pkl
ai-predictive/app/model/weights/label_encoder.pkl
```

### 9. Seed the database

```bash
python scripts/seed_data.py
```

---

## Running the Project

Open 5 terminals:

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

# Terminal 6 — Sensor Simulator (optional, for live demo)
python scripts/simulate_sensor.py
```

Open http://localhost:3000

---

## Verify All Services

```bash
curl http://localhost:8000/health   # {"status":"ok","service":"backend"}
curl http://localhost:8001/health   # {"status":"ok","service":"ai-vision"}
curl http://localhost:8002/health   # {"status":"ok","service":"ai-predictive"}
curl http://localhost:11434/api/tags  # Ollama model list
```

---

## Docker (Full Stack)

```bash
docker compose up --build
```

> Ollama must still run on the host. The Docker setup connects via `host.docker.internal:11434`.

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
| GET | `/sensors/{silo_id}` | Get sensor history for a silo |
| GET | `/sensors/forecast/{silo_id}` | Get 12-hour AI forecast |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/alerts/{silo_id}` | List alerts for a silo |
| PATCH | `/alerts/{alert_id}/read` | Mark alert as read |

### Images
| Method | Endpoint | Description |
|---|---|---|
| POST | `/images/upload?silo_id={id}` | Upload grain image → AI disease classification |
| GET | `/images/{silo_id}` | Get image scan history |

### Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat` | Send message to AI agronomist (live DB context injected) |

### WebSocket
| Channel | URL | Description |
|---|---|---|
| Alerts | `ws://localhost:8000/ws/alerts` | Real-time alert push to all connected clients |

### AI Vision Service (`http://localhost:8001`)
```bash
POST /analyze   # multipart/form-data, field: "file"
GET  /health
```

### AI Predictive Service (`http://localhost:8002`)
```bash
POST /predict   # {"temperature": float, "humidity": float, "soil_moisture": float, "ndvi": float}
GET  /health
```

**Example:**
```bash
curl -X POST http://localhost:8002/predict \
  -H "Content-Type: application/json" \
  -d '{"temperature": 42, "humidity": 85, "soil_moisture": 25, "ndvi": 0.2}'
# {"risk_score": 75, "risk_level": "high", "status": "ok"}
```

---

## AI Models

### AI Vision — Grain Disease Classifier
| Property | Detail |
|---|---|
| Framework | TensorFlow 2.17 / Keras |
| Input | 255×255 RGB image, normalized to [0,1] |
| Validation Accuracy | 78.22% |
| Classes (14) | Aphid, Black Rust, Blast, Brown Rust, Fusarium Head Blight, Healthy Wheat, Leaf Blight, Mildew, Mite, Septoria, Smut, Stem Fly, Tan Spot, Yellow Rust |

### AI Predictive — Risk Scorer
| Property | Detail |
|---|---|
| Framework | XGBoost + scikit-learn Pipeline |
| Input | Temperature, Humidity, Soil Moisture, NDVI |
| Test Accuracy | 89% (5-fold CV: 90.4%, std: 0.0047) |
| Output | Critical → high (75), Stressed → medium (45), Healthy → low (15) |
| Inference Latency | 60ms end-to-end |

### AI Chatbot
| Property | Detail |
|---|---|
| Engine | Ollama |
| Default Model | llama3.1:8b |
| Pattern | RAG-lite — live DB context injected per query |

---

## Project Structure

```
Silo/
├── .env                        # Environment config (not in Git)
├── .env.example                # Environment template
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app, CORS, WebSocket, health
│   │   ├── api/
│   │   │   ├── silos.py
│   │   │   ├── sensors.py      # Ingest pipeline + forecast
│   │   │   ├── alerts.py
│   │   │   ├── images.py
│   │   │   └── chat.py         # Ollama + live DB context
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic Settings
│   │   │   └── database.py     # asyncpg pool
│   │   ├── models/             # Pydantic schemas
│   │   └── ws/alerts.py        # WebSocket ConnectionManager
│   ├── migrations/             # Alembic migrations
│   └── requirements.txt
├── ai-vision/
│   ├── app/
│   │   ├── main.py
│   │   ├── Final_model.keras   # Not in Git — place manually
│   │   └── model/
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
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Dashboard
│   │   ├── live-map/           # Geospatial map
│   │   └── silos/[id]/         # Silo diagnostics
│   ├── components/
│   ├── context/
│   └── lib/api.ts
└── scripts/
    ├── seed_data.py            # Seeds 5 silos + 30 readings each
    └── simulate_sensor.py      # Continuous sensor ingestion
```

---

## Known Limitations

- No authentication — all endpoints are publicly accessible
- No rate limiting on sensor ingestion or image upload
- Chatbot responds in English only
- Model files must be placed manually (not in Git due to size)

---

## Team

Built by the Silo Engineering Team — Egypt-Japan University of Science and Technology.
Supported by [nWeave](http://nweave.com).S