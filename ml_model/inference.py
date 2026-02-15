"""
Inference only: load saved Prophet models and produce recommendations.
No training, no Prophet.fit(), no cmdstan. Fast response for API.
"""

import json
import logging
import pickle
import re
from pathlib import Path
from typing import Any

LOG = logging.getLogger(__name__)
MODELS_DIR = Path(__file__).resolve().parent / "models"
HORIZON_DAYS = 30


def _safe_fname(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", str(name))[:200]


def load_models(models_dir: Path) -> tuple[dict[str, Any], dict]:
    """
    Load all .pkl models from models_dir.
    If meta.json is missing, generate it from the .pkl filenames.
    Returns (models_dict, meta_dict).
    """
    models_dir = Path(models_dir)
    models = {}
    meta = {}
    
    if not models_dir.exists():
         LOG.warning("Models directory %s does not exist.", models_dir)
         return models, meta

    # Load meta.json if it exists
    meta_path = models_dir / "meta.json"
    if meta_path.exists():
        try:
            with open(meta_path) as f:
                meta = json.load(f)
        except Exception as e:
            LOG.warning("Failed to load meta.json: %s. Will auto-generate.", e)

    # Load models
    pkl_files = list(models_dir.glob("*.pkl"))
    for path in pkl_files:
        product_name = path.stem.replace("_", " ") # Simplistic reverse logic
        
        # If meta is missing for this file, auto-generate
        if product_name not in meta:
             meta[product_name] = {"past_avg": 100} # Default dummy value

        try:
            with open(path, "rb") as f:
                models[product_name] = pickle.load(f)
        except Exception as e:
            LOG.warning("Failed to load model %s: %s", path.name, e)

    return models, meta


def get_recommendations_from_models(
    models_dict: dict[str, Any],
    meta_dict: dict,
    horizon_days: int = HORIZON_DAYS,
) -> list[dict]:
    """
    Use pre-loaded models to generate forecasts and return ranked recommendations.
    No training. Uses only model.predict().
    """
    if not models_dict or not meta_dict:
        return []

    rows = []
    pred_sales_list = []
    growth_list = []

    for product, model in models_dict.items():
        info = meta_dict.get(product)
        if not info:
            continue
        past_avg = float(info.get("past_avg", 0))
        try:
            future = model.make_future_dataframe(periods=horizon_days, freq="D")
            pred = model.predict(future)
        except Exception as e:
            LOG.warning("Predict failed for %s: %s", product, e)
            continue

        # Last horizon_days rows are the forecast
        tail = pred.tail(horizon_days)
        if tail.empty:
            continue
        yhat = tail["yhat"]
        predicted_total = float(yhat.sum())
        future_avg = float(yhat.mean())

        if past_avg <= 0:
            growth_rate = 0.0
        else:
            growth_rate = (future_avg - past_avg) / past_avg * 100.0

        pred_sales_list.append(predicted_total)
        growth_list.append(growth_rate)
        rows.append(
            {
                "product": product,
                "predicted_sales": round(predicted_total, 2),
                "growth_rate": round(growth_rate, 2),
            }
        )

    if not rows:
        return []

    pred_max = max(pred_sales_list) or 1
    growth_max = max(growth_list) if growth_list else 1
    growth_min = min(growth_list) if growth_list else 0

    for r in rows:
        sales_norm = r["predicted_sales"] / pred_max if pred_max else 0
        g = r["growth_rate"]
        if growth_max > growth_min:
            growth_norm = (g - growth_min) / (growth_max - growth_min)
        else:
            growth_norm = 0.5
        score = 0.5 * sales_norm + 0.5 * growth_norm
        r["recommendation_score"] = round(min(1.0, max(0.0, score)), 4)

    rows.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return [
        {
            "product": r["product"],
            "predicted_sales": r["predicted_sales"],
            "growth_rate": r["growth_rate"],
            "recommendation_score": r["recommendation_score"],
        }
        for r in rows
    ]
