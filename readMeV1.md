# Silo — readMeV1

TL;DR: backend now has real farmer accounts, a live fake-sensor pipeline, and a claim/release flow for silos. Web dashboard bugs (charts, PDF, thermal twin, silo status) are fixed. Read the bullets below, not the code, unless you're touching that area.

---

## Run it (fresh machine)

```bash
cp .env.example .env          # fill in OLLAMA_MODEL etc if you use chat
docker compose up -d --build backend    # build backend FIRST (tools below need its image)
docker compose up -d --build            # everything else
docker compose --profile tools run --rm seed              # 4 demo silos
docker compose --profile tools run --rm backfill-sensors   # 24h fake sensor history
docker compose --profile tools up -d simulate               # keeps sending fake readings every 20 min
```

Frontend: http://localhost:3000 · Backend docs: http://localhost:8000/docs

**⚠️ Heads up:** `ai-vision`'s and `ai-soil`'s model weight files (`Final_model.keras` 272MB, `convnext_soil.pth` 107MB) are **not in git** (too big for GitHub without LFS). Everything else works fine, but disease scanning and soil scanning will say "unavailable" until someone hands you those two files manually. `ai-predictive`'s weights ARE in git — sensors/forecast/alerts work out of the box.

**Rebuild rule:** never rebuild the whole stack for a small change — `docker compose up -d --no-deps --build backend` (or `backend frontend`) is seconds; a full rebuild is 1h+.

---

## How the core pipeline works

1. `simulate` container = fake sensor fleet. Posts one reading per silo every 20 min to `POST /sensors/ingest` — same endpoint real hardware would hit.
2. Ingest classifies the reading via the `ai-predictive` microservice (XGBoost, NDVI-driven — temp/humidity barely matter except a cold-stress dip below ~20°C).
3. medium/high risk → alert created, pushed over WebSocket + FCM.
4. `GET /sensors/forecast/{id}` projects 12h ahead from the recent trend, classifies each projected point too, and raises a **predicted** alert if it's heading into risk (separate from a **measured** alert).
5. A silo's displayed "condition" = worse of (live classification of latest reading) vs (any measured alert < 6h old). This is computed once, shared by web dashboard, mobile `/users/me/silos`, and the PDF report — so they can't disagree anymore.

---

## Feature workflows

**Farmer account + claim a silo (mobile)**
- Register/login → JWT.
- Government (web) taps a silo's ID chip → generates a one-time code → shares it.
- Farmer enters code in app → `POST /silos/claim` → silo appears on their dashboard.
- New: farmer can **release** a silo (`POST /silos/{id}/release`) — soft delete, just clears ownership. Silo, its history, its alerts stay in the DB. Government can re-issue a code, same or different farmer can claim it again.

**Sensor simulation**
- `scripts/sensor_walk.py` — realistic random walk per silo (not uniform noise): fast jitter + slow multi-hour drift + day/night cycle.
- Regional climate baked in by location text — Luxor/Upper Egypt hottest, Alexandria/coast coolest & most humid. Matches real Egypt geography.
- `backfill_sensor_history.py` — one-off, seeds 24h of history instantly (since ingest can't backdate).

**Alerts**
- `GET /users/me/alerts` — one feed across all a farmer's silos (mobile).
- Web hydrates alerts on page load now (used to be WebSocket-only — went blank on refresh).
- Predictive alerts auto-resolve once a fresh reading comes back healthy — they don't just sit there forever.

**AI Vision + AI Soil + Disease/Soil Encyclopedias**
- Same pattern both ways: scan a photo → get label + confidence → tiered treatment/guidance protocol.
- Web now has a **Soil Encyclopedia** page (new — mirrors the existing Disease Encyclopedia, same backend endpoint mobile already used).

**PDF Report (web + mobile)**
- Web: browser print → PDF, built from exactly what's on screen (no more fake fallback data if a silo has no readings).
- Mobile: server-rendered PDF at `GET /reports/{id}/pdf`.

---

## Bugs fixed  (the "oh that's why" list)

- Backend wouldn't even boot — missing router files, missing pip deps. Fixed.
- New farmers had an empty, broken dashboard — no silos, no data. Now: register → claim flow works, or auto-claim for quick testing.
- WebSocket alerts sent the *sensor reading's* ID instead of the *alert's* ID — marking one as read 404'd. Fixed.
- Alerts only fired on "high" risk — "medium" was silently dropped even though both apps have UI for it. Fixed.
- Predictive ("in ~3h") alerts were noisy/wrong — a single jagged model data point could trigger a false "high" alert. Now requires 2 consecutive risky forecast points, and auto-resolves when reality doesn't match the prediction.
- Silo "condition" badge used to freeze on whatever alert fired last — a silo that recovered days ago could still show "High Risk" forever. Now it's live, and it was fixed **three separate times** in three different places (web list, web detail, PDF) because nothing shared one function — now they all call the same one.
- Sensor chart's time axis was fake — every point (whether 20 min or 25 hours apart) got drawn evenly spaced. Real chart now shows real gaps (a real ~25h outage rendered as an actual visible gap once fixed).
- Chart/forecast window didn't match what mobile already agreed to (6h+6h idea, landed on 12h history + 12h forecast since that's the model's real horizon, NOW marker centered).
- Forecast math could run away and flatline at max clamp values (50°C/100%) — trend now decays properly instead of compounding.
- The predictive model was never actually loading inside the backend container (wrong file path) — silently broken since it was added.
- Thermal Digital Twin showed made-up numbers if a silo had zero readings, and exaggerated heat by painting the real reading as the *coldest* zone instead of the middle. Fixed both.
- PDF export used to fabricate 0°C/0% instead of showing "no data," and could inject mock data under a real silo's ID. Fixed — honest blanks now.

---

## Mobile vs Web — what changed where

| | Mobile | Web |
|---|---|---|
| Auth | ✅ built (JWT, register/login) | n/a — dashboard stays public (govt view) |
| Claim/release silo | ✅ built + this session's release feature | ✅ tap-to-generate claim code UI |
| Alerts feed | ✅ `/users/me/alerts` | ✅ hydrates on load now (was WS-only) |
| Push notifications | ✅ FCM wired (no-op without a real key) | n/a |
| Sensor chart | (your own UI, same backend data) | ✅ real-time axis + NOW marker fixed |
| PDF report | ✅ server-rendered endpoint | ✅ browser-print, now truthful |
| Soil Encyclopedia | already had it | ✅ new page added, same data |

---

## Known gaps (not fixed, on purpose — flagging for whoever picks these up)

- **Auth coverage is thin**: only 4 of ~24 backend routes require login. Sensor ingest, the PDF report, claim-code generation, and the chatbot are all wide open right now. Fine for local/demo, not fine to expose publicly as-is.
- Chatbot pulls **every** silo into its context regardless of who's asking — cross-farmer data leak. Also its hardcoded safety thresholds don't match what the real risk model actually does.
- No automated tests, no CI, anywhere in the repo.
- `ai-vision`/`ai-soil` model weight files aren't in git (see top of this doc).

Full technical detail on all of the above lives in `.agents/CLAUDE.md` (gitignored, local reference only — this file is the version meant to actually get read).
