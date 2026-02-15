"""
FastAPI server for SalesSight ML recommendations.
Training is separate (run train.py). On startup we load pre-trained models only.
/recommend uses loaded models for inference only; no retraining.
"""

import logging
import uvicorn
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from inference import load_models, get_recommendations_from_models, MODELS_DIR

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger(__name__)

# Loaded at startup; never retrained in API
_models: dict = {}
_meta: dict = {}
_models_loaded: bool = False

class PredictRequest(BaseModel):
    products: list[str]
    horizon: int = 30

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all saved models into memory once at startup. No training."""
    global _models, _meta, _models_loaded
    
    # Auto-generate meta.json if missing logic is handled in load_models
    _models, _meta = load_models(MODELS_DIR)
    _models_loaded = len(_models) > 0
    
    if _models_loaded:
        LOG.info("Loaded %d models at startup (inference only).", len(_models))
    else:
        LOG.warning("No models loaded. API will return mock data.")
    
    yield
    # shutdown: nothing to do


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def health():
    """Health check: status and whether models are loaded."""
    return {"status": "ok", "models_loaded": _models_loaded}


@app.post("/predict")
def predict_endpoint(req: PredictRequest):
    """
    Return predictions. If models are missing, return mock data.
    """
    if not _models_loaded:
        LOG.info("Models not loaded. Returning mock data for /predict")
        return {
            "status": "mock",
            "predictions": [
                {"product": p, "prediction": 100 + i*10, "confidence": 0.9} 
                for i, p in enumerate(req.products)
            ]
        }
        
    # Real inference logic would go here, utilizing _models
    # For now, simplistic return based on loaded models or mock fallback
    results = []
    for p in req.products:
        if p in _models: # Correct check against dict
             results.append({"product": p, "prediction": 150, "confidence": 0.95})
        else:
             results.append({"product": p, "prediction": 100, "confidence": 0.8}) # Fallback
    
    return {"status": "success", "predictions": results}


@app.get("/recommend")
def recommend():
    """
    Return ranked recommendations using pre-loaded models only.
    If models not loaded, returns mock data instead of error.
    """
    if not _models_loaded:
        LOG.info("Models not loaded. Returning mock recommendations.")
        return [
            {"product": "Mock Product A", "predicted_sales": 500, "growth_rate": 15.5, "recommendation_score": 0.95},
            {"product": "Mock Product B", "predicted_sales": 300, "growth_rate": 10.2, "recommendation_score": 0.88},
            {"product": "Mock Product C", "predicted_sales": 150, "growth_rate": 5.0, "recommendation_score": 0.75},
        ]

    recs = get_recommendations_from_models(_models, _meta)
    return recs


@app.get("/products")
def get_products():
    """Return list of all available product models."""
    if not _models_loaded:
        return {"products": []}
    return {"products": list(_models.keys())}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
