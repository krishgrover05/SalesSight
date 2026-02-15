"""
Orchestrates the full ML pipeline: load -> clean -> train Prophet per product ->
forecast 30/90 days -> evaluate (MAE, RMSE) -> rank -> save models -> output recommendations.

Exposes run_pipeline() for use by the backend.
"""

import json
from pathlib import Path
from typing import Any, Optional

from preprocess import get_preprocessed, get_products
from forecast import _prepare_prophet_series, train_prophet_for_product, forecast_days
from evaluate import split_train_val, evaluate_product_forecast
from recommend import build_recommendations

# Paths
DATA_ROOT = Path(__file__).resolve().parent.parent / "data"
MODELS_DIR = Path(__file__).resolve().parent / "models"
OUTPUT_DIR = Path(__file__).resolve().parent / "output"
VAL_DAYS = 30
HORIZONS = (30, 90)


def _train_and_evaluate_one_product(
    df: Any,
    product: str,
    val_days: int,
    models_dir: Path,
) -> tuple[Any, dict[str, float], dict]:
    """
    For one product: split train/val, train on train, compute MAE/RMSE on val,
    then retrain on full series, save model, return model + metrics + forecast data.
    """
    series_full = _prepare_prophet_series(df, product)
    if len(series_full) < 10:
        return None, {"mae": float("nan"), "rmse": float("nan")}, {}

    train_series, val_series = split_train_val(series_full, val_days=val_days)
    if len(train_series) < 2:
        return None, {"mae": float("nan"), "rmse": float("nan")}, {}

    # Train on train only for evaluation
    model_val = train_prophet_for_product(train_series, product, save_path=None)
    metrics = evaluate_product_forecast(series_full, model_val, val_days=val_days)

    # Production model: train on full series and save
    model_full = train_prophet_for_product(
        series_full,
        product,
        save_path=models_dir / f"{_safe_fname(product)}.pkl",
    )
    fc_30 = forecast_days(model_full, periods=30, freq="D")
    fc_90 = forecast_days(model_full, periods=90, freq="D")
    last_ds = series_full["ds"].max()
    fc_30_future = fc_30[fc_30["ds"] > last_ds][["ds", "yhat"]].rename(columns={"ds": "date", "yhat": "predicted_sales"})
    fc_90_future = fc_90[fc_90["ds"] > last_ds][["ds", "yhat"]].rename(columns={"ds": "date", "yhat": "predicted_sales"})

    return (
        model_full,
        metrics,
        {
            "series": series_full,
            "forecast_30": fc_30_future,
            "forecast_90": fc_90_future,
        },
    )


def _safe_fname(name: str) -> str:
    import re
    return re.sub(r'[<>:"/\\|?*]', "_", str(name))[:200]


def run_training_only(
    data_root: Optional[Path] = None,
    models_dir: Optional[Path] = None,
    max_products: Optional[int] = None,
) -> None:
    """
    Training only: load data, train Prophet per product, save models and meta.json.
    No inference, no evaluation. API will load these artifacts for /recommend.
    """
    data_root = data_root or DATA_ROOT
    models_dir = models_dir or MODELS_DIR
    models_dir = Path(models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    df = get_preprocessed(data_root=data_root)
    if df.empty:
        raise ValueError("No data after preprocessing.")

    products = get_products(df)
    if max_products is not None and max_products > 0:
        products = products[:max_products]
    if not products:
        raise ValueError("No products found.")

    meta = {}
    for product in products:
        try:
            series = _prepare_prophet_series(df, product)
            if len(series) < 2:
                continue
            save_path = models_dir / f"{_safe_fname(product)}.pkl"
            train_prophet_for_product(series, product, save_path=save_path)
            last_ds = series["ds"].max()
            past_avg = float(series["y"].mean())
            meta[product] = {
                "past_avg": past_avg,
                "last_ds": str(last_ds.date()) if hasattr(last_ds, "date") else str(last_ds),
            }
        except Exception as e:
            import warnings
            warnings.warn(f"Skip product {product!r}: {e}")

    meta_path = models_dir / "meta.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    return None


def run_pipeline(
    data_root: Optional[Path] = None,
    models_dir: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    val_days: int = VAL_DAYS,
    horizons: tuple[int, ...] = HORIZONS,
    max_products: Optional[int] = None,
) -> dict[str, Any]:
    """
    Run the full pipeline and return a dict with:
      - recommendations: list of { product, predicted_sales, growth_rate, recommendation_score }
      - metrics: dict[product_name, { mae, rmse }]
      - forecast_30 / forecast_90: optional per-product forecast DataFrames (not serialized in return; saved via run_forecasts_for_products or in output dir)
    Saves models to models_dir and writes recommendations + metrics to output_dir.
    Call this from the backend (e.g. subprocess or Python import).
    max_products: if set, train only the first N products (by name) for faster runs.
    """
    data_root = data_root or DATA_ROOT
    models_dir = models_dir or MODELS_DIR
    output_dir = output_dir or OUTPUT_DIR
    models_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1) Load and preprocess
    df = get_preprocessed(data_root=data_root)
    if df.empty:
        return {
            "recommendations": [],
            "metrics": {},
            "message": "No data after preprocessing.",
        }

    products = get_products(df)
    if max_products is not None and max_products > 0:
        products = products[: max_products]
    if not products:
        return {
            "recommendations": [],
            "metrics": {},
            "message": "No products found.",
        }

    # 2) Train, evaluate, and forecast per product
    forecast_results = {}
    metrics = {}

    for product in products:
        try:
            model, m, data = _train_and_evaluate_one_product(
                df, product, val_days=val_days, models_dir=models_dir
            )
            if model is not None and data:
                forecast_results[product] = data
                metrics[product] = m
        except Exception as e:
            metrics[product] = {"mae": float("nan"), "rmse": float("nan"), "error": str(e)}

    # 3) Rank and build recommendation list
    recommendations = build_recommendations(forecast_results, horizon=30)

    # 3b) Save meta.json for API inference (past_avg, last_ds per product)
    meta = {}
    for product, data in forecast_results.items():
        series = data.get("series")
        if series is not None and not series.empty:
            last_ds = series["ds"].max()
            meta[product] = {
                "past_avg": float(series["y"].mean()),
                "last_ds": str(last_ds.date()) if hasattr(last_ds, "date") else str(last_ds),
            }
    meta_path = models_dir / "meta.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)

    # 4) Save outputs
    out_path = output_dir / "recommendations.json"
    with open(out_path, "w") as f:
        json.dump(recommendations, f, indent=2)

    metrics_path = output_dir / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    return {
        "recommendations": recommendations,
        "metrics": metrics,
        "products_trained": len(forecast_results),
        "output_dir": str(output_dir),
    }


def get_recommendations(
    data_root: Optional[Path] = None,
    models_dir: Optional[Path] = None,
) -> list[dict]:
    """
    Convenience: run the pipeline and return only the recommendation list.
    Can be called by the Node backend (e.g. via child_process or a small Python HTTP service).
    """
    result = run_pipeline(data_root=data_root, models_dir=models_dir)
    return result.get("recommendations", [])


if __name__ == "__main__":
    run_training_only()
    print("Training complete. Models saved to models/. Run API with: uvicorn api:app --reload")
