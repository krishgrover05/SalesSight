"""
Time-series forecasting per product using Prophet.
Produces 30-day and 90-day forecasts.
"""

from pathlib import Path
from typing import Any, Optional

import pandas as pd

# Prophet is optional at import; required when training
try:
    from prophet import Prophet
except ImportError:
    Prophet = None

MODELS_DIR = Path(__file__).resolve().parent / "saved_models"


def _prepare_prophet_series(df: pd.DataFrame, product_name: str) -> pd.DataFrame:
    """Extract daily series for one product. Prophet expects ds (date) and y (value)."""
    sub = df[df["product_name"] == product_name][["date", "sales"]].copy()
    sub = sub.rename(columns={"date": "ds", "sales": "y"})
    sub["ds"] = pd.to_datetime(sub["ds"]).dt.tz_localize(None)
    sub = sub.sort_values("ds").drop_duplicates(subset=["ds"]).reset_index(drop=True)
    return sub


def train_prophet_for_product(
    series: pd.DataFrame,
    product_name: str,
    save_path: Optional[Path] = None,
) -> Any:
    """
    Train a Prophet model on one product's daily sales.
    series: DataFrame with columns ds (datetime), y (sales).
    Returns fitted Prophet model.
    """
    if Prophet is None:
        raise RuntimeError("prophet is not installed. pip install prophet")

    if len(series) < 2:
        raise ValueError(f"Need at least 2 points for product {product_name!r}")

    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        uncertainty_samples=0,  # faster; set >0 for interval width
    )
    model.fit(series)

    if save_path:
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        if save_path.suffix != ".pkl":
            save_path = save_path.with_suffix(".pkl")
        import pickle
        with open(save_path, "wb") as f:
            pickle.dump(model, f)

    return model


def forecast_days(
    model: Any,
    periods: int = 30,
    freq: str = "D",
) -> pd.DataFrame:
    """Generate future dataframe and predict. Returns DataFrame with ds and yhat (and yhat_lower/yhat_upper if available)."""
    future = model.make_future_dataframe(periods=periods, freq=freq)
    pred = model.predict(future)
    return pred


def run_forecasts_for_products(
    df: pd.DataFrame,
    products: list[str],
    horizons: tuple[int, ...] = (30, 90),
    models_dir: Optional[Path] = None,
) -> dict[str, dict]:
    """
    For each product: train Prophet, save model, run forecast for each horizon.
    Returns dict[product_name, { "model": model, "forecast_30": df, "forecast_90": df, "series": df }].
    """
    if Prophet is None:
        raise RuntimeError("prophet is not installed. pip install prophet")

    models_dir = Path(models_dir) if models_dir else MODELS_DIR
    models_dir.mkdir(parents=True, exist_ok=True)
    results = {}

    for product in products:
        series = _prepare_prophet_series(df, product)
        if len(series) < 2:
            continue
        save_path = models_dir / f"{_safe_filename(product)}.pkl"
        model = train_prophet_for_product(series, product, save_path=save_path)
        out = {"model": model, "series": series}
        for h in horizons:
            pred = forecast_days(model, periods=h, freq="D")
            # Only future rows (beyond last observed date)
            last_ds = series["ds"].max()
            pred_future = pred[pred["ds"] > last_ds][["ds", "yhat"]].copy()
            pred_future = pred_future.rename(columns={"ds": "date", "yhat": "predicted_sales"})
            out[f"forecast_{h}"] = pred_future
        results[product] = out

    return results


def _safe_filename(name: str) -> str:
    """Replace characters unsafe for filenames."""
    import re

    return re.sub(r'[<>:"/\\|?*]', "_", name)[:200]
