# 🌾 Silo — Smart Grain Management & AI Diagnostics

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.17-FF6F00?style=for-the-badge&logo=tensorflow)](https://tensorflow.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python)](https://python.org/)

---

## 📋 Project Overview

**Silo** is an enterprise-grade, AI-powered grain silo management platform designed to give agricultural operators real-time visibility into the health, safety, and status of their storage infrastructure. The system unifies live sensor telemetry, AI-based disease diagnostics, and intelligent risk alerting into a single, beautifully crafted command center.

> **Mission:** Transform raw silo data into actionable intelligence — before spoilage, pest infestations, or environmental hazards cause irreversible loss.

### What makes Silo different?

- 🤖 **On-device AI Vision** — upload a grain photo and receive instant disease classification (Rust, Mildew, Aphids, and more) with a confidence score.
- ⚡ **Real-time WebSocket Alerts** — the backend pushes live risk alerts to every connected operator simultaneously, with zero polling.
- 🛡️ **Demo-Safe Resilient UI** — if the backend is offline, the frontend auto-injects realistic mock data so presentations never crash.
- 🎨 **Dynamic Risk Theming** — every card, border, and glow effect responds to the live `risk_level` of each silo.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Client)                           │
│                                                                     │
│  Next.js 15 App (TypeScript · Tailwind CSS · Framer Motion)        │
│  ┌────────────────────┐   ┌──────────────────────────────────────┐ │
│  │  Command Center    │   │  Silo Diagnostics Page               │ │
│  │  Dashboard         │   │  - SensorChart (Recharts)            │ │
│  │  - SiloCard Grid   │   │  - Alert History Row                 │ │
│  │  - Risk Badges     │   │  - AI Vision Scanner                 │ │
│  └────────────────────┘   └──────────────────────────────────────┘ │
│                    │                      │                          │
│         REST (Axios, 2s timeout)   WebSocket (/ws/alerts)          │
└──────────────────────┬───────────────────┬──────────────────────────┘
                       │                   │
           ╔═══════════▼═══════════════════▼═════════════╗
           ║              FastAPI Backend                 ║
           ║   (Python · Uvicorn · asyncpg · Alembic)    ║
           ║                                             ║
           ║  /silos   /sensors   /alerts   /images      ║
           ║  /ws/alerts  (WebSocket broadcast hub)      ║
           ╚═══════════════════╦═════════════╦═══════════╝
                               │             │
              ╔════════════════▼══╗  ╔═══════▼══════════════════╗
              ║   PostgreSQL 15   ║  ║  AI Vision Service        ║
              ║   (silo_db)       ║  ║  (FastAPI · TensorFlow)   ║
              ║   - silos         ║  ║  Port :8001               ║
              ║   - sensor_readings║  ║  POST /analyze            ║
              ║   - alerts        ║  ╚══════════════════════════╝
              ║   - images        ║
              ╚═══════════════════╝
```

### Data Flow Summary

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | Next.js 15 + TypeScript | UI, state management, API calls, WebSocket client |
| **Backend API** | FastAPI + Uvicorn | REST endpoints, WebSocket hub, DB access, AI proxy |
| **AI Vision** | FastAPI + TensorFlow | Image classification, disease detection |
| **AI Predictive** | FastAPI + XGBoost | Predictive risk scoring based on sensor trends |
| **Database** | PostgreSQL 15 + asyncpg | Persistent storage for all silo entities |

> **Important:** The frontend **never** communicates with the database or AI services directly. All requests are routed through the FastAPI backend, which acts as the single point of trust.

---

## ✨ Key Features

### 1. 🖥️ Command Center Dashboard
The main dashboard displays all registered silos as interactive cards. Each card:
- Dynamically **changes color theme, glow effect, and border** based on the silo's `risk_level` (`none`, `low`, `medium`, `high`).
- Features a **rotating conic-gradient border animation** that accelerates on hover (Framer Motion).
- Shows the latest **temperature** and **humidity** readings from the most recent sensor entry.
- Navigates to the full Silo Diagnostics page on click.

### 2. ⚡ Real-time Alerts Panel
A persistent WebSocket connection (`ws://localhost:8000/ws/alerts`) subscribes to live backend events:
- **Pulsing, colored notification dots** for unread alerts.
- Risk-level-aware icon styling: 🔥 High, ⚠️ Medium, 🛡️ Low/Info.
- Auto-reconnects if the socket drops.

### 3. 📈 Silo Diagnostics Page
Each silo's dedicated page provides a full-system view:
- **24-hour Sensor History Chart** — dual-axis line chart (Temperature + Humidity) built with Recharts.
- **Risk Badge** — animated, pulsing status indicator.
- **Sensor Widgets** — large, gradient-text display of latest live values.
- **Recent Alerts List** — ordered by `triggered_at`, color-coded by `risk_level`.

### 4. 🤖 AI Vision Scanner
A drag-and-drop image upload component for grain disease detection:
- Accepts JPG/PNG images and POSTs them to `POST /images/upload/{silo_id}`.
- Displays a **futuristic scanning laser animation** while awaiting the model response.
- The result card shows the `detected_label` (e.g., `"Rust"`, `"Healthy Wheat"`) and a confidence **progress bar**.
- Supports 14 disease categories including Aphid, Black Rust, Blast, Mildew, Smut, and more.

### 5. 🛡️ Resilient UI — Fallback Mode
All API calls use a `2000ms` timeout and are wrapped in `Promise.allSettled()`:
- If the backend is unreachable, the UI **auto-injects realistic mock data** for all silos, sensor charts, and alerts.
- A subtle **"Backend unavailable — showing demo data"** banner is displayed.
- This guarantees the UI is always presentable, even without a live backend.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.0 | App Router, SSR, routing |
| **TypeScript** | ^5 | Type safety |
| **Tailwind CSS** | ^4 | Utility-first styling |
| **Framer Motion** | ^12 | Animations, gestures, spring physics |
| **Recharts** | ^3 | Sensor data visualization (line charts) |
| **Axios** | ^1 | HTTP client with timeout support |
| **Lucide React** | ^0.577 | Icon library |
| **next-themes** | ^0.4 | Dark mode support |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.111.0 | REST API + WebSocket server |
| **Uvicorn** | 0.29.0 | ASGI production server |
| **asyncpg** | 0.29.0 | High-performance async PostgreSQL driver |
| **Alembic** | 1.13.1 | Database schema migrations |
| **Pydantic v2** | 2.7.1 | Data validation and serialization |
| **python-dotenv** | 1.0.1 | Environment variable loading |

### AI/ML Services
| Technology | Version | Purpose |
|---|---|---|
| **TensorFlow** | 2.17.0 | Grain disease classification model (AI Vision) |
| **XGBoost** | 2.0.3 | Risk score prediction (AI Predictive) |
| **scikit-learn** | 1.4.2 | Model preprocessing pipelines |
| **Pillow** | 10.4.0 | Image loading and preprocessing |
| **NumPy** | 1.26.4 | Array operations for model inference |

---

## 🚀 Local Development Setup

### Prerequisites
Before getting started, ensure you have the following installed:
- [Node.js](https://nodejs.org/) v18+ and `npm`
- [Python](https://python.org/) 3.11+
- [PostgreSQL](https://postgresql.org/) 15+ (running on port 5432)

### Step 1: Clone & Configure Environment

```bash
# Clone the repository
git clone <repository-url>
cd Silo

# Create the .env file in the root directory
# Copy the example below and fill in your credentials
```

Create a `.env` file in the project root:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=silo_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

AI_VISION_URL=http://localhost:8001
AI_PREDICTIVE_URL=http://localhost:8002

UPLOADS_DIR=./uploads
```

---

### Option A: 🐳 Docker (Recommended for Production-like Setup)

```bash
# Build and start all services (DB, Backend, AI services, Frontend)
docker compose up --build

# Services will be available at:
# Frontend  → http://localhost:3000
# Backend   → http://localhost:8000
# AI Vision → http://localhost:8001
```

---

### Option B: 💻 Manual Setup (For Development)

#### 1. Set Up the Python Virtual Environment

```bash
# Create and activate the virtual environment
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install all Python dependencies
pip install fastapi uvicorn[standard] asyncpg pydantic pydantic-settings \
            python-multipart httpx alembic psycopg2-binary python-dotenv \
            xgboost scikit-learn pandas joblib pillow numpy
```

#### 2. Create the Database & Run Migrations

```bash
# Create the PostgreSQL database (run from project root)
python create_db_temp.py

# Run database migrations
cd backend
alembic upgrade head
cd ..
```

#### 3. Seed Sample Data (Optional but Recommended)

```bash
# Populate the database with feature-complete sample data
# (4 silos, 48h of sensor logs, alerts, and AI detection history)
python scripts/comprehensive_seed.py
```

#### 4. Start the Backend Services

Open **3 separate terminals**:

```bash
# Terminal 1 — Main Backend API (Port 8000)
cd backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — AI Vision Service (Port 8001)
cd ai-vision
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3 — AI Predictive Service (Port 8002)
cd ai-predictive
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

#### 5. Start the Frontend

```bash
# Terminal 4 — Frontend (Port 3000)
cd frontend
npm install
npm run dev
```

#### 6. Verify All Services Are Running ✅

```bash
# Health checks (run from project root in PowerShell)
Invoke-RestMethod -Uri http://localhost:8000/health
Invoke-RestMethod -Uri http://localhost:8001/health
Invoke-RestMethod -Uri http://localhost:8002/health
# Then open http://localhost:3000 in your browser
```

---

## 📡 API Endpoints Reference

### Base URL: `http://localhost:8000`

#### Silos

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/silos` | List all silos with latest state | `SiloResponse[]` |
| `GET` | `/silos/{id}` | Get a single silo by UUID | `SiloResponse` |
| `POST` | `/silos` | Create a new silo | `SiloResponse` |

#### Sensor Readings

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/sensors/{silo_id}` | Get sensor history for a silo (latest 24h) | `SensorReading[]` |
| `POST` | `/sensors` | Record a new sensor reading | `SensorReading` |

#### Alerts

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/alerts/{silo_id}` | Get all alerts for a silo, ordered by `triggered_at` DESC | `AlertResponse[]` |
| `PATCH` | `/alerts/{alert_id}/read` | Mark an alert as read | `AlertResponse` |

#### AI Vision (Image Diagnostics)

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `POST` | `/images/upload/{silo_id}` | Upload a grain image for AI analysis | `{ detected_label, confidence, status }` |
| `GET` | `/images/{silo_id}` | Get image detection history for a silo | `ImageRecord[]` |

#### WebSocket

| Channel | URL | Description |
|---|---|---|
| **Alerts Stream** | `ws://localhost:8000/ws/alerts` | Real-time push of new alerts to all connected clients |

#### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Backend health check |
| `GET` | `/docs` | Interactive Swagger UI (auto-generated) |
| `GET` | `/redoc` | ReDoc API documentation |

---

## 📁 Project Structure

```
Silo/
├── .env                         # Root environment variables
├── docker-compose.yml           # Full-stack Docker orchestration
├── DOCUMENTATION.md             # This file
│
├── backend/                     # FastAPI Backend Service
│   ├── app/
│   │   ├── api/                 # Route handlers (silos, sensors, alerts, images)
│   │   ├── core/                # Config, database pool
│   │   ├── models/              # Pydantic schemas
│   │   └── ws/                  # WebSocket alert manager
│   ├── migrations/              # Alembic migration scripts
│   └── requirements.txt
│
├── ai-vision/                   # TensorFlow Disease Detection Service (Port 8001)
│   ├── app/
│   │   └── model/weights/       # Trained Keras .keras model file
│   └── requirements.txt
│
├── ai-predictive/               # XGBoost Risk Prediction Service (Port 8002)
│   └── app/
│
├── frontend/                    # Next.js 15 Application (Port 3000)
│   ├── app/                     # App Router pages
│   │   ├── page.tsx             # Command Center Dashboard
│   │   └── silos/[id]/          # Silo Diagnostics Page
│   ├── components/              # Reusable UI components
│   │   ├── SiloCard.tsx         # Dynamic risk-reactive silo card
│   │   ├── SensorChart.tsx      # Recharts temperature/humidity chart
│   │   └── AIVisionScanner.tsx  # Drag-and-drop disease scanner
│   ├── lib/api.ts               # API base URL & WebSocket config
│   └── context/                 # React context providers
│
└── scripts/
    ├── seed_db.py               # Basic data seeding script
    └── comprehensive_seed.py    # Full feature-demo seeding script
```

---

## 📜 License

This project is proprietary software. All rights reserved.

---

*Built with precision and care by the Silo Engineering Team.*
