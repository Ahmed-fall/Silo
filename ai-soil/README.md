## AI Soil Service

FastAPI image classification service for soil type analysis. It accepts a soil image and returns the predicted soil label with confidence.

download the model from the following link :
https://drive.google.com/drive/u/0/folders/1-p1cQqsLw02nhKgY2kSarQlw0Qkbfboy?sort=13&direction=a

### Model
PyTorch ConvNeXt soil classification model
Base architecture: `facebook/convnext-tiny-224`
Weights path: `ai-soil/app/model/weights/convnext_soil.pth`
Input size: `128x128`

### Classes
0: Alluvial soil
1: Black Soil
2: Clay soil
3: Red soil

### API
`POST /analyze`

Multipart form field:

```text
file=<image>
```

Success response:

```json
{
  "label": "Alluvial soil",
  "confidence": 0.91,
  "status": "ok"
}
```

Health check:

```text
GET /health
```

### Run Locally
From the repository root:

```bash
cd ai-soil
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

### Docker
This service now has a Dockerfile and is included in `docker-compose.yml` as `ai-soil`.

```bash
docker compose up ai-soil
```

### Frontend / Backend Integration
This feature follows the existing `ai-vision` architecture:

- The Next.js frontend does not call `ai-soil` directly.
- The frontend calls the backend endpoint `POST /soil/analyze`.
- The backend proxies that request to `AI_SOIL_URL/analyze`.
- Local default: `AI_SOIL_URL=http://localhost:8003`.
- Docker backend override: `AI_SOIL_URL=http://ai-soil:8003`.

Frontend files added:

- `frontend/components/AISoilScanner.tsx`
- `frontend/app/soil-analysis/page.tsx`

Backend files added/updated:

- `backend/app/api/soil.py`
- `backend/app/core/config.py`
- `backend/app/main.py`

Navigation was updated in:

- `frontend/components/Sidebar.tsx`

### Test With Curl

```bash
curl -X POST http://localhost:8003/analyze \
  -F "file=@path/to/soil-image.jpg"
```

Through the backend proxy:

```bash
curl -X POST http://localhost:8000/soil/analyze \
  -F "file=@path/to/soil-image.jpg"
```
