
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
import os
import torch
from torchvision import transforms
from transformers import AutoModelForImageClassification

app = FastAPI(title="Silo Soil AI Service")

# ── Model Configuration (from notebook) ──────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "weights", "convnext_soil.pth")
# Update these class names based on your actual model's classes
CLASS_NAMES = ['Alluvial soil', 'Black Soil', 'Clay soil', 'Red soil']
IMG_SIZE = 128
MEAN = [0.48, 0.47, 0.42] # These values came from your notebook
STD = [0.226, 0.225, 0.227] # These values came from your notebook
NUM_CLASSES = len(CLASS_NAMES)
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

model = None

# ── Transforms (Paper Specs) ─────────────────────────────────────────────────
# This transform should match the validation/test transform used during training
preprocess_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=MEAN, std=STD),
])

def load_model():
    global model
    try:
        # Load the model architecture
        model = AutoModelForImageClassification.from_pretrained(
            "facebook/convnext-tiny-224",
            num_labels=NUM_CLASSES,
            ignore_mismatched_sizes=True
        )
        # Load the trained weights
        model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
        model = model.to(DEVICE)
        model.eval() # Set model to evaluation mode
        print("PyTorch model loaded successfully")
    except Exception as e:
        print(f"Failed to load PyTorch model: {e}")
        model = None

load_model()

# ── Inference ──────────────────────────────────────────────────
def run_inference(image_bytes: bytes) -> dict:
    """
    Preprocess image and run PyTorch model inference.
    Returns label and confidence.
    """
    if model is None:
        raise RuntimeError("Model not loaded")

    # Load and preprocess image
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image_tensor = preprocess_transform(image).unsqueeze(0).to(DEVICE) # Add batch dimension

    # Run inference
    with torch.no_grad():
        outputs = model(pixel_values=image_tensor).logits
        probabilities = torch.softmax(outputs, dim=1)
    
    predicted_index = torch.argmax(probabilities, dim=1).item()
    confidence = probabilities[0][predicted_index].item()
    label = CLASS_NAMES[predicted_index]

    return {"label": label, "confidence": round(confidence, 4)}

# ── Endpoints ──────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """
    POST /analyze
    Input : image file (multipart/form-data, field name: 'file')
    Output: { "label": "Alluvial soil", "confidence": 0.91, "status": "ok" }
    """
    if model is None:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable", 
                "detail": "Model is not loaded. Check server logs for errors during startup."
            }
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
            content={
                "status": "error", 
                "detail": f"Prediction failed: {str(e)}"
            }
        )

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "soil-ai-vision"}