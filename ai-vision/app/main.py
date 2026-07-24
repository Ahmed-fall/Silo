from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
import os
import json

app = FastAPI(title="Silo AI Vision Service")

# ── Model Loading ──────────────────────────────────────────────
WEIGHTS_DIR = os.path.join(os.path.dirname(__file__), "model", "weights")
MODEL_PATH = os.path.join(WEIGHTS_DIR, "final_model.onnx")
CONFIG_PATH = os.path.join(WEIGHTS_DIR, "preprocess_config.json")

# Fallback defaults if preprocess_config.json (written by train.ipynb) isn't
# present yet -- CLASS_NAMES order must match the training notebook's CLASS_NAMES.
CLASS_NAMES = [
    "Aphid", "Black Rust", "Blast", "Brown Rust",
    "Fusarium Head Blight", "Healthy Wheat", "Leaf Blight",
    "Mildew", "Mite", "Septoria", "Smut", "Stem fly",
    "Tan spot", "Yellow Rust"
]
IMAGE_SIZE = (256, 256)
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]

session = None
input_name = None
output_name = None

def load_model():
    global session, input_name, output_name, CLASS_NAMES, IMAGE_SIZE, MEAN, STD
    try:
        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH) as f:
                config = json.load(f)
            CLASS_NAMES = config["class_names"]
            IMAGE_SIZE = tuple(config["image_size"])
            MEAN = config["mean"]
            STD = config["std"]

        import onnxruntime as ort
        session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        print("Model loaded successfully")
    except Exception as e:
        print(f"Failed to load model: {e}")
        session = None

load_model()

# ── Inference ──────────────────────────────────────────────────
def softmax(logits: np.ndarray) -> np.ndarray:
    exp = np.exp(logits - np.max(logits))
    return exp / exp.sum()

def run_inference(image_bytes: bytes) -> dict:
    """
    Preprocess image and run ONNX model inference.
    Returns label and confidence.
    """
    # Load and preprocess image to match training: resize, [0,1] scale,
    # per-channel normalize, HWC -> CHW, add batch dim (NCHW for ONNX/PyTorch).
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize(IMAGE_SIZE)
    img_array = np.array(image, dtype=np.float32) / 255.0
    img_array = (img_array - MEAN) / STD
    img_array = img_array.transpose(2, 0, 1)
    img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

    # Run inference
    logits = session.run([output_name], {input_name: img_array})[0][0]
    probabilities = softmax(logits)
    predicted_index = int(np.argmax(probabilities))
    confidence = float(np.max(probabilities))
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
    if session is None:
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
