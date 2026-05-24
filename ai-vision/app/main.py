from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
import os
 
app = FastAPI(title="Silo AI Vision Service")

# ── Model Loading ──────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "weights", "final_model.keras")
CLASS_NAMES = [
    "Aphid", "Black Rust", "Blast", "Brown Rust",
    "Fusarium Head Blight", "Healthy Wheat", "Leaf Blight",
    "Mildew", "Mite", "Septoria", "Smut", "Stem fly",
    "Tan spot", "Yellow Rust"
]
model = None

def load_model():
    global model
    try:
        import tensorflow as tf
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully")
    except Exception as e:
        print(f"Failed to load model: {e}")
        model = None
 
load_model()
 
# ── Inference ──────────────────────────────────────────────────
def run_inference(image_bytes: bytes) -> dict:
    """
    Preprocess image and run Keras model inference.
    Returns label and confidence.
    """
    # Load and preprocess image
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((255, 255))  # standard input size
    img_array = np.array(image, dtype=np.float32) / 255.0
    img_array = np.expand_dims(img_array, axis=0)  # add batch dimension
 
    # Run inference
    predictions = model.predict(img_array, verbose=0)
    predicted_index = int(np.argmax(predictions[0]))
    confidence = float(np.max(predictions[0]))
    label = CLASS_NAMES[predicted_index]
 
    return {"label": label, "confidence": round(confidence, 4)}
 
# ── Endpoints ──────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    POST /analyze
    Input : image file (multipart/form-data, field name: 'file')
    Output: { "label": "rust|blast|mildew|healthy", "confidence": 0.91, "status": "ok" }
    """
    if model is None:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable"}
        )
 
    try:
        image_bytes = await file.read()
        result = run_inference(image_bytes)
        return {
            "label": result["label"],
            "confidence": result["confidence"],
            "status": "ok"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "unavailable", "detail": str(e)}
        )
 


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-vision"}