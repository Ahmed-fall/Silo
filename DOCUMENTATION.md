# 🌾 Silo — AI-Powered Grain Silo Management & Diagnostics Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.17-FF6F00?style=for-the-badge&logo=tensorflow)](https://tensorflow.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![Ollama](https://img.shields.io/badge/Ollama-LLM-white?style=for-the-badge)](https://ollama.com/)

---

## 📋 Project Overview

**Silo** is an enterprise-grade, AI-powered grain silo management platform built for national agricultural operators. It unifies live sensor telemetry, AI-based disease diagnostics, predictive risk scoring, geospatial monitoring, and a conversational AI agronomist into a single premium command center.

> **Mission:** Transform raw silo data into actionable intelligence — before spoilage, pest infestations, or environmental hazards cause irreversible loss.

### What makes Silo different?

- 🤖 **On-device AI Vision** — upload a grain photo and receive instant disease classification across 14 categories (Rust, Mildew, Aphids, Blast, Smut, and more) with a confidence score.
- 💬 **Live AI Agronomist Chatbot** — a context-aware LLM assistant (powered by Ollama) that reads your **live silo database** and provides expert Egyptian agricultural advice in real time.
- ⚡ **Real-time WebSocket Alerts** — the backend pushes live risk alerts to every connected operator simultaneously, with zero polling.
- 📊 **Sensor History + AI Forecast Chart** — 24-hour historical readings with a 12-hour AI-generated predictive forecast overlay, computed from XGBoost model trends.
- 🗺️ **Geospatial Command Map** — an interactive SVG map of Egypt plotting every silo's live risk status with pulsing, color-coded nodes and a slide-over details drawer.
- 🛡️ **Demo-Safe Resilient UI** — if the backend is offline, the frontend auto-injects realistic mock data so presentations never crash.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (Client)                               │
│                                                                             │
│  Next.js 16.2  ·  TypeScript  ·  Tailwind CSS v4  ·  Framer Motion         │
│                                                                             │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────────┐ │
│  │  Dashboard        │  │  Live Map          │  │  Silo Diagnostics Page   │ │
│  │  · SiloCard Grid  │  │  · Egypt SVG Map   │  │  · SensorChart (AI +     │ │
│  │  · Risk Badges    │  │  · PulseNodes      │  │    Forecast)             │ │
│  │  · Stats Row      │  │  · SiloDrawer      │  │  · ThermalSiloMap        │ │
│  └──────────────────┘  └───────────────────┘  │  · AIVisionScanner       │ │
│                                                │  · Alert History          │ │
│  ┌─────────────────────────────────────────┐   └──────────────────────────┘ │
│  │  Persistent UI Shell                     │                               │
│  │  · Sidebar + Nav                         │  ┌──────────────────────────┐ │
│  │  · LiveAlertsPanel (Dynamic Island)      │  │  ChatBot (Floating FAB)   │ │
│  │  · SettingsDrawer (Compact Mode, Mute)   │  │  · Ollama LLM             │ │
│  └──────────────────────────────────────────┘  │  · Live DB Context        │ │
│                                                 └──────────────────────────┘ │
│                 │               │                         │                   │
│     REST (Axios, 10s timeout)  WebSocket            POST /chat               │
└─────────────────┬───────────────┬─────────────────────────┬──────────────────┘
                  │               │                         │
      ╔═══════════▼═══════════════▼═════════════════════════▼════════════╗
      ║                     FastAPI Backend  (:8000)                      ║
      ║      Python · Uvicorn · asyncpg · Alembic · Pydantic v2           ║
      ║                                                                    ║
      ║  /silos        /sensors/ingest    /sensors/{id}                   ║
      ║  /sensors/forecast/{id}           /alerts/{silo_id}               ║
      ║  /images/upload  /images/{id}     /chat                           ║
      ║  /ws/alerts  (WebSocket broadcast hub)                            ║
      ╚════════════════════╦════════════════════╦═════════════════════════╝
                           │                    │
         ╔═════════════════▼═══╗   ╔════════════▼══════════════════════╗
         ║   PostgreSQL 15+    ║   ║  AI Vision Service  (:8001)       ║
         ║   (silo_db)         ║   ║  FastAPI · TensorFlow · Keras     ║
         ║   · silos           ║   ║  POST /analyze  GET /health       ║
         ║   · sensor_readings ║   ╚═══════════════════════════════════╝
         ║   · alerts          ║
         ║   · images          ║   ╔═══════════════════════════════════╗
         ╚═════════════════════╝   ║  AI Predictive Service  (:8002)   ║
                                   ║  FastAPI · XGBoost · scikit-learn ║
                                   ║  POST /predict  GET /health       ║
                                   ╚═══════════════════════════════════╝

                                   ╔═══════════════════════════════════╗
                                   ║  Ollama LLM Server  (:11434)      ║
                                   ║  Local · gemma2 / llama3.2 / etc  ║
                                   ║  POST /api/chat                   ║
                                   ╚═══════════════════════════════════╝
```

### Data Flow Summary

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | Next.js 16.2 + TypeScript | UI, state management, REST/WebSocket client, AI chat |
| **Backend API** | FastAPI + Uvicorn | Single API gateway: REST, WebSocket hub, AI proxy |
| **AI Vision** | FastAPI + TensorFlow/Keras | Image classification — 14 grain disease categories |
| **AI Predictive** | FastAPI + XGBoost | Sensor-based risk scoring and 12-hour forecast generation |
| **AI Chatbot** | Ollama (local LLM) | Conversational agronomist with live DB context injection |
| **Database** | PostgreSQL 15+ + asyncpg | All persistent entities: silos, sensors, alerts, images |

> **Important:** The frontend **never** communicates with the database, AI services, or Ollama directly. All requests route through the FastAPI backend.

---

## ✨ Feature Reference

### 1. 🖥️ Command Center Dashboard (`/`)
The main entry point displays all registered silos as animated cards in a responsive grid.

- **Spinning conic-gradient border** — each card has a continuously rotating border that accelerates to full speed on hover (Framer Motion + `useMotionValue`).
- **Risk theming** — the border gradient color changes per `risk_level`: Turquoise (Nominal), Bronze (Caution), Red (Critical). Card interior stays clean white glass (`.glass-tactical`).
- **Sensor widgets** — latest temperature (°C) and humidity (%) with gradient text indicators.
- **Stats row** — live counts of Total, At-Risk, and Nominal silos, computed from current data.
- **Demo fallback** — if the backend is offline, mock data is shown with a bronze banner notice.
- **Compact grid mode** — toggled via SettingsContext, compresses card spacing.

---

### 2. 🗺️ Geospatial Command Map (`/live-map`)
A full-viewport, interactive map of Egypt plotting every silo's live risk status.

- **SVG map layer** — a real Egypt governorate path map embedded as inline SVG with a frosted, light-gray silhouette fill and subtle Turquoise stroke.
- **PulseNodes** — each silo is rendered as a pulsing animated dot at its geographic coordinate. Colors: Turquoise (Nominal/Low), Bronze (Medium), Red (Critical). Pulse speed increases with risk severity.
- **LOCATION_COORDS dictionary** — a manually calibrated lookup table mapping 30+ Egyptian city/governorate names to SVG percentage coordinates. Fuzzy matching handles transliterations.
- **SiloDrawer** — clicking a node opens a slide-over panel from the right showing: silo name, location, risk badge, temperature, humidity, fill level, crop type, and AI vision status. Includes "Open Full Diagnostics" link.
- **StatusPill bar** — command bar at the top shows live counts of Nominal, Caution, and Critical silos.
- **Error state** — if backend is unreachable, shows a clean error badge instead of crashing.

---

### 3. 🏭 Silo Diagnostics Page (`/silos/[id]`)
Each silo's dedicated full-system diagnostic view.

- **Risk badge** — animated, pulsing indicator with Framer Motion `boxShadow` keyframes.
- **Sensor widgets** — large gradient-text displays of latest temperature, humidity, fill percentage, and capacity.
- **Capacity widget** — animated SVG wave fill gauge that reflects `fill_pct` with color-coded thresholds (Turquoise → Bronze → Red).
- **Alert history** — ordered list of recent alerts color-coded by severity (Critical = Red, Warning = Bronze, Info = Blue).
- **PDF report button** — triggers `window.print()` with full print CSS overrides for clean A4 output.
- **Auto-refresh on focus** — refetches data when the browser tab regains focus.

---

### 4. 📈 Sensor History & AI Forecast Chart
Dual-line chart embedded in the Silo Diagnostics page, built with Recharts.

- **Historical lines** — Temperature (Amber→Rose gradient) and Humidity (Cyan→Blue gradient) with SVG glow filters.
- **12-hour AI forecast overlay** — dashed Purple/Fuchsia lines extending from the last historical reading. In production, these are computed by the backend `/sensors/forecast/{id}` endpoint using XGBoost trend prediction.
- **Bridge point** — a seamless visual handoff at the exact last historical timestamp connects the solid and dashed lines without gaps.
- **Custom tooltip** — shows time, date, temperature, humidity, and whether the point is a historical reading or an AI prediction, with a `🔮 AI Prediction` badge.
- **Custom legend** — solid gradient swatches for historical lines, dashed swatch for AI Forecast.
- **SVG gradient defs** — each line uses a unique `linearGradient` and layered `feGaussianBlur` glow filter for premium visual depth.

---

### 5. 🌡️ Thermal Digital Twin
3D-style cylindrical silo visualization embedded in the Silo Diagnostics page.

- **Four thermal zones** — Top, Upper, Lower, Bottom — each colored by temperature threshold (Blue = Safe ≤23°C, Green = Normal ≤27°C, Amber = Caution ≤32°C, Red = Critical >32°C).
- **Zone zones breathe** — each zone uses a looping `animate` with staggered delay for a live-data illusion.
- **Radar scanner** — an animated bright green line sweeps top-to-bottom continuously, creating a "scanning" effect.
- **Zone legend** — shows each zone's exact temperature and a human-readable status label.
- **Dynamic construction** — zones are built from actual silo temperature and humidity values via `buildThermalZones()`, so the digital twin reflects real data.

---

### 6. 🤖 AI Vision Scanner
Drag-and-drop grain disease detection panel on the Silo Diagnostics page.

- **File upload** — accepts JPG/PNG images via drag-and-drop or click-to-open-file-picker.
- **Scanning animation** — a sweeping laser-line animation plays while awaiting the TensorFlow model response.
- **Classification result** — displays: `detected_label` (e.g., `Healthy Wheat`, `Black Rust`), confidence percentage as an animated progress bar, and a severity interpretation.
- **14 disease categories**: Aphid, Black Rust, Blast, Brown Rust, Fusarium Head Blight, Healthy Wheat, Leaf Blight, Mildew, Mite, Septoria, Smut, Stem Fly, Tan Spot, Yellow Rust.
- **History** — previously uploaded images and their results are fetched from `GET /images/{silo_id}`.

---

### 7. 💬 AI Agronomist Chatbot
A floating chat assistant (`ChatBot.tsx`) available on all pages.

- **Floating Action Button (FAB)** — Turquoise circle in the bottom-right corner. Hover shows a `"Hi there! Need help? 👋"` tooltip.
- **Live database context injection** — before every message, the backend queries the live silos table and injects current silo names, locations, temperatures, humidity, and risk levels into the LLM system prompt.
- **Expert knowledge base** — the system prompt includes Egyptian-climate-specific thresholds: safe temperature ranges, humidity danger zones, Aflatoxin trigger conditions, and actionable remediation advice.
- **Multi-turn conversation** — full message history is passed to Ollama on every request for coherent multi-turn dialogue.
- **Quick suggestions** — four preset prompt chips appear on first open: "Which silos are at high risk?", "What are the signs of wheat spoilage?", "How can I lower the temperature?", "Show me Alpha Depot status".
- **Markdown rendering** — responses are rendered with `react-markdown` (bold, bullet lists, headers).
- **Configurable model** — `OLLAMA_MODEL` in `.env` selects the active model. Default: `gemma2:9b-instruct-q4_K_M`.
- **Graceful error** — if Ollama is offline, a clear error message with fix instructions is displayed inside the chat.

---

### 8. ⚡ Real-time Alerts System
WebSocket-powered live alert push to all connected clients simultaneously.

- **Dynamic Island pill** — a morphing pill widget at the top-center of every page. Collapsed = connection status dot + unread badge. Expanded = latest alert message with severity icon. Auto-collapses after 4 seconds.
- **Bell panel** — full dropdown panel showing all alerts with severity icons (🔥 Critical, ⚠️ Warning, ℹ️ Info), timestamps, and read/unread state.
- **Mark as read** — clicking an unread alert row calls `PATCH /alerts/{alert_id}/read` with an optimistic UI update and spinner.
- **Connection indicator** — shows `Wifi · Live` or `WifiOff · Reconnecting` with auto-reconnect logic in `AlertContext`.
- **Muted mode** — configured via `SettingsContext`; muted state replaces the bell with a `BellOff` icon and hides the Dynamic Island.
- **Auto-triggered alerts** — when `POST /sensors/ingest` receives a high-risk reading, the backend automatically inserts an alert and broadcasts it to all connected WebSocket clients.

---

### 9. ⚙️ Settings Drawer
A slide-over settings panel accessible via the Sidebar.

- **Compact grid mode** — reduces card gap spacing on the dashboard grid.
- **Alerts muted toggle** — silences the Dynamic Island and bell notifications globally via `SettingsContext`.
- All settings are applied instantly via React Context with no page reload.

---

### 10. 🛡️ Demo-Safe Resilient UI
All API calls are wrapped with `try/catch` and `AbortController`:

- **Dashboard** — falls back to 8 realistic MOCK_SILOS with full sensor data.
- **Silo Diagnostics** — falls back to MOCK_SILO detail + MOCK_ALERTS array + 24-hour generated sensor waveform.
- **Live Map** — shows "Failed to connect to database" badge on the command bar rather than crashing.
- **Auto-refresh on focus** — all data views re-fetch when the browser tab regains focus via `window.addEventListener("focus", ...)`.

---

## 🎨 Design System

The UI uses a **"Premium Government Modern Chic"** aesthetic — Apple-style minimalism combined with tactical precision.

### Design Tokens (CSS Custom Properties)

| Token | Value | Role |
|---|---|---|
| `--bg-base` | `#F8FAFC` | Main page background |
| `--bg-surface` | `rgba(255,255,255,0.75)` | Frosted glass panels |
| `--bg-elevated` | `rgba(255,255,255,0.95)` | Header, drawers, dropdowns |
| `--accent` | `#40E0D0` | Turquoise — nominal status, interactive highlights |
| `--alert` | `#E11D48` | Rose/Red — critical alerts, errors |
| `--warning` | `#CD7F32` | Bronze/Copper — caution status |
| `--text-primary` | `#0F172A` | Primary readable text |
| `--text-secondary` | `#475569` | Labels, subtitles |
| `--text-muted` | `#94A3B8` | Captions, placeholders |
| `--border-glass` | `rgba(64,224,208,0.30)` | Ultra-thin Turquoise panel borders |
| `--border-muted` | `rgba(15,23,42,0.08)` | Dividers |

### Glassmorphism — `.glass-tactical`
```css
.glass-tactical {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(64, 224, 208, 0.30);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2.0 | App Router, SSR, routing |
| **TypeScript** | ^5 | Type safety |
| **Tailwind CSS** | ^4 | Utility-first styling with `@tailwindcss/postcss` |
| **Framer Motion** | ^12 | Animations, spring physics, gesture handling |
| **Recharts** | ^3 | Sensor chart and forecast visualization |
| **Axios** | ^1 | HTTP client with timeout and abort signal support |
| **Lucide React** | ^0.577 | Icon library |
| **react-markdown** | ^10 | Markdown rendering in chatbot messages |
| **next-themes** | ^0.4 | Theme context (reserved for future dark mode toggle) |
| **clsx + tailwind-merge** | latest | Conditional className utilities |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.111.0 | REST API + WebSocket hub |
| **Uvicorn** | 0.29.0 | ASGI server |
| **asyncpg** | 0.29.0 | High-performance async PostgreSQL driver |
| **Alembic** | 1.13.1 | Database schema migrations |
| **Pydantic v2** | 2.7.1 | Data validation and serialization |
| **httpx** | latest | Async HTTP client for AI service requests |
| **python-dotenv** | 1.0.1 | `.env` loading |

### AI/ML Services
| Technology | Version | Purpose |
|---|---|---|
| **TensorFlow / Keras** | 2.17.0 | Grain disease image classification (14 classes) |
| **XGBoost** | 2.0.3 | Sensor risk prediction and forecast adjustment |
| **scikit-learn** | 1.4.2 | Label encoding and model preprocessing |
| **Pillow** | 10.4.0 | Image preprocessing for TensorFlow input |
| **NumPy** | 1.26.4 | Array operations for model inference |
| **joblib** | latest | Model weight loading (`.pkl` files) |

### AI Chatbot
| Technology | Detail |
|---|---|
| **Ollama** | Local LLM runtime — must be installed and running separately |
| **Default model** | `gemma2:9b-instruct-q4_K_M` (configurable via `OLLAMA_MODEL` env) |
| **Compatible models** | Any Ollama-supported chat model: `llama3.2`, `mistral`, `qwen2.5`, etc. |

---

## 🚀 Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ and `npm`
- [Python](https://python.org/) 3.11+
- [PostgreSQL](https://postgresql.org/) 15+ (running on port 5432)
- [Ollama](https://ollama.com/download) (for the AI Chatbot feature)

---

### Step 1: Clone & Configure Environment

```bash
git clone <repository-url>
cd Silo
```

Create a `.env` file in the **project root** (`Silo/.env`):

```env
# ─── PostgreSQL ───────────────────────────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=silo_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# ─── Backend ──────────────────────────────────────────────────
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# ─── AI Services ──────────────────────────────────────────────
AI_VISION_URL=http://localhost:8001
AI_PREDICTIVE_URL=http://localhost:8002

# ─── AI Chatbot (Ollama) ──────────────────────────────────────
# Run: ollama serve  (in a separate terminal)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma2:9b-instruct-q4_K_M

# ─── File Storage ─────────────────────────────────────────────
UPLOADS_DIR=./uploads
```

---

### Option A: 🐳 Docker (Recommended for Full-Stack Setup)

```bash
docker compose up --build

# Services:
# Frontend  → http://localhost:3000
# Backend   → http://localhost:8000
# AI Vision → http://localhost:8001
```

> Note: Ollama must still be run locally on the host. The Docker setup connects to `host.docker.internal:11434`.

---

### Option B: 💻 Manual Setup (For Development)

#### 1. Set Up Python Virtual Environment

```bash
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\activate
# macOS / Linux:
source .venv/bin/activate

pip install fastapi uvicorn[standard] asyncpg pydantic pydantic-settings \
            python-multipart httpx alembic psycopg2-binary python-dotenv \
            xgboost scikit-learn pandas joblib pillow numpy tensorflow
```

#### 2. Fix PostgreSQL Permissions & Run Migrations

If `silo_user` doesn't have schema permissions (common on Postgres 15+), run as the `postgres` superuser in pgAdmin or `psql`:

```sql
ALTER ROLE silo_user SUPERUSER;
ALTER DATABASE silo_db OWNER TO silo_user;
GRANT ALL ON SCHEMA public TO silo_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO silo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO silo_user;
```

Then run migrations:

```bash
cd backend
alembic upgrade head
cd ..
```

#### 3. Seed Sample Data

```bash
# Comprehensive seed: silos, 48h sensor history, alerts, AI scan records
python scripts/comprehensive_seed.py

# Or run a live sensor simulator continuously:
python scripts/simulate_sensor.py
```

#### 4. Start All Backend Services (3 Terminals)

```bash
# Terminal 1 — Main Backend API
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — AI Vision Service
cd ai-vision
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 3 — AI Predictive Service
cd ai-predictive
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

#### 5. Start Ollama (Chatbot)

```bash
# Install from https://ollama.com/download, then:
ollama serve

# First time only — pull the default model:
ollama pull gemma2:9b-instruct-q4_K_M
```

#### 6. Start the Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

#### 7. Verify All Services ✅

```powershell
# PowerShell health checks
Invoke-RestMethod -Uri http://localhost:8000/health  # → { status: "ok", service: "backend" }
Invoke-RestMethod -Uri http://localhost:8001/health  # → { status: "ok", service: "ai-vision" }
Invoke-RestMethod -Uri http://localhost:8002/health  # → { status: "ok", service: "ai-predictive" }
Invoke-RestMethod -Uri http://localhost:11434/api/tags  # → Ollama model list
```

---

## 📡 API Reference

### Base URL: `http://localhost:8000`

#### Silos

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/silos` | List all silos with latest sensor state and risk level (via lateral joins) | `SiloDetailResponse[]` |
| `GET` | `/silos/{id}` | Get a single silo by UUID with latest sensor & risk data | `SiloDetailResponse` |
| `POST` | `/silos` | Create a new silo | `SiloResponse` |

**`SiloDetailResponse` includes:** `id`, `name`, `location`, `capacity_kg`, `created_at`, `temperature`, `humidity`, `soil_moisture`, `ndvi`, `risk_level`, `risk_score`, `crop_type`, `fill_pct`

#### Sensors

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/sensors/{silo_id}` | Get all sensor readings for a silo, ordered by `recorded_at DESC` | `SensorResponse[]` |
| `POST` | `/sensors/ingest` | Ingest a new sensor reading. **Automatically** calls the AI Predictive service, creates an alert if `high` risk, and broadcasts via WebSocket. | `SensorResponse` |
| `GET` | `/sensors/forecast/{silo_id}` | Generate a 12-hour AI forecast from recent readings using XGBoost trend analysis. Returns same shape as sensor readings. | `ForecastPoint[]` |

**`POST /sensors/ingest` body:** `{ silo_id, temperature, humidity, soil_moisture, ndvi }`

#### Alerts

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/alerts/{silo_id}` | Get all alerts for a silo ordered by `triggered_at DESC` | `AlertResponse[]` |
| `PATCH` | `/alerts/{alert_id}/read` | Mark a specific alert as read | `AlertResponse` |

#### AI Vision (Image Diagnostics)

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `POST` | `/images/upload?silo_id={id}` | Upload a grain image. Saves file, sends to AI Vision service, stores `detected_label` + `confidence`. | `ImageResponse` |
| `GET` | `/images/{silo_id}` | Get image scan history for a silo | `ImageResponse[]` |

#### Chat (AI Agronomist)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | Send a message to the AI agronomist. Injects live silo DB context into system prompt and returns Ollama LLM response. |

**`POST /chat` body:** `{ message: string, model?: string, history: Message[] }`

#### WebSocket

| Channel | URL | Description |
|---|---|---|
| **Alerts Stream** | `ws://localhost:8000/ws/alerts` | Push-only channel. Backend broadcasts new alert JSON to all connected clients whenever a high-risk sensor reading is ingested. |

**WebSocket alert payload:** `{ id, silo_id, silo_name, risk_level, risk_score, severity, message, timestamp, triggered_at, read }`

#### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status: "ok", service: "backend" }` |
| `GET` | `/docs` | Interactive Swagger UI (auto-generated by FastAPI) |
| `GET` | `/redoc` | ReDoc API documentation |

---

## 📁 Full Project Structure

```
Silo/
├── .env                              # Root environment configuration
├── docker-compose.yml                # Full-stack Docker orchestration
├── DOCUMENTATION.md                  # This file
├── README.md                         # Quick-start reference
│
├── backend/                          # FastAPI Backend Service (:8000)
│   ├── app/
│   │   ├── api/
│   │   │   ├── silos.py              # GET/POST /silos, GET /silos/{id}
│   │   │   ├── sensors.py            # GET /sensors/{id}, POST /sensors/ingest, GET /sensors/forecast/{id}
│   │   │   ├── alerts.py             # GET /alerts/{id}, PATCH /alerts/{id}/read
│   │   │   ├── images.py             # POST /images/upload, GET /images/{id}
│   │   │   └── chat.py               # POST /chat — Ollama LLM with live DB context
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic Settings model (reads from .env)
│   │   │   └── database.py           # asyncpg connection pool init/close
│   │   ├── models/                   # Pydantic request/response schemas
│   │   │   ├── silo.py
│   │   │   ├── sensor.py
│   │   │   ├── alert.py
│   │   │   └── image.py
│   │   ├── ws/
│   │   │   └── alerts.py             # WebSocket ConnectionManager (broadcast hub)
│   │   └── main.py                   # FastAPI app, CORS, router registration, /ws/alerts, /health
│   ├── migrations/                   # Alembic migration scripts
│   └── requirements.txt
│
├── ai-vision/                        # TensorFlow Disease Classifier (:8001)
│   ├── app/
│   │   ├── main.py                   # POST /analyze, GET /health — 14-class Keras inference
│   │   ├── Final_model.keras         # Trained model weights
│   │   └── model/
│   └── requirements.txt
│
├── ai-predictive/                    # XGBoost Risk Predictor (:8002)
│   ├── app/
│   │   ├── main.py                   # POST /predict, GET /health
│   │   └── model/
│   │       ├── predict.py            # Inference logic
│   │       └── weights/
│   │           ├── crop_health_model_xgb.pkl
│   │           └── label_encoder.pkl
│   └── requirements.txt
│
├── frontend/                         # Next.js 16.2 Application (:3000)
│   ├── app/
│   │   ├── globals.css               # Design tokens, .glass-tactical, glow utilities, print styles
│   │   ├── layout.tsx                # Root layout: Sidebar, header, LiveAlertsPanel, main
│   │   ├── page.tsx                  # Command Center Dashboard — SiloCard grid + stats
│   │   ├── live-map/
│   │   │   └── page.tsx              # Geospatial Command Map — SVG Egypt + PulseNodes
│   │   └── silos/[id]/
│   │       └── page.tsx              # Silo Diagnostics — chart, thermal, scanner, alerts
│   ├── components/
│   │   ├── Sidebar.tsx               # Navigation sidebar with settings drawer trigger
│   │   ├── SiloCard.tsx              # Animated risk-reactive card (conic border + glass interior)
│   │   ├── SensorChart.tsx           # Recharts historical + AI forecast dual-line chart
│   │   ├── ThermalSiloMap.tsx        # 3D thermal cylinder digital twin
│   │   ├── AIVisionScanner.tsx       # Drag-and-drop disease scanner with laser animation
│   │   ├── LiveAlertsPanel.tsx       # Dynamic Island + bell panel + WebSocket alerts
│   │   ├── ChatBot.tsx               # Floating AI agronomist chatbot (Ollama + react-markdown)
│   │   ├── SettingsDrawer.tsx        # Compact mode + mute alerts settings panel
│   │   └── CropIcon.tsx              # SVG crop icon set
│   ├── context/
│   │   ├── AlertContext.tsx          # WebSocket connection, alerts state, mark-as-read
│   │   └── SettingsContext.tsx       # compactMode, alertsMuted global state
│   ├── lib/
│   │   └── api.ts                    # API_BASE URL config
│   ├── public/                       # Static assets
│   ├── next.config.ts
│   ├── tailwind.config (via postcss) # Tailwind CSS v4 via @tailwindcss/postcss
│   └── package.json
│
└── scripts/
    ├── comprehensive_seed.py         # Seeds: 4+ silos, 48h sensor history, alerts, AI image records
    ├── seed_data.py                  # Core seed data definitions
    ├── seed_db.py                    # Basic silo + sensor seeder
    ├── simulate_sensor.py            # Continuous sensor ingestion simulator (pushes to /sensors/ingest)
    ├── start_local.sh                # Shell script: starts all backend services + frontend
    └── start_docker.sh               # Shell script: Docker compose orchestration helper
```

---

## 🐛 Known Issues & Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `permission denied for table alembic_version` | PostgreSQL 15+ restricts schema access for non-owner roles | Run the SQL permission grants listed in Step 2 of the manual setup |
| `Module not found: react-markdown` | Dependency missing from `node_modules` | `cd frontend && npm install` |
| Port 3000 already in use | Previous `next dev` process still running | `taskkill /PID <PID> /F` or use port 3001 by default |
| `Cannot connect to Ollama` | Ollama service not running | Run `ollama serve` in a separate terminal |
| `ai-vision` returns `503 unavailable` | TensorFlow model not found at `Final_model.keras` | Ensure model file exists at `ai-vision/app/Final_model.keras` |
| Backend returns `500` on startup | DB tables don't exist yet | Run `alembic upgrade head` from the `backend/` directory |

---

## 📜 License

This project is proprietary software. All rights reserved.

---

*Built with precision for the national grain preservation mission — Silo Engineering Team.*
