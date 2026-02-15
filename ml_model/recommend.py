"""
Rank products by predicted sales and growth rate; produce recommendation list with score.
"""

from pathlib import Path
from typing import Any, Optional

import pandas as pd

# Data root for default get_recommendations() run
DATA_ROOT = Path(__file__).resolve().parent.parent / "data"


def compute_growth_rate(
    past_sales: pd.Series,
    future_sales: pd.Series,
) -> float:
    """
    Growth rate as (future_avg - past_avg) / past_avg * 100 if past_avg > 0, else 0.
    """
    past_avg = float(past_sales.mean())
    future_avg = float(future_sales.mean())
    if past_avg <= 0:
        return 0.0
    return (future_avg - past_avg) / past_avg * 100.0


def build_recommendations(
    forecast_results: dict[str, dict],
    horizon: int = 30,
) -> list[dict]:
    """
    forecast_results: from run_forecasts_for_products: dict[product, { series, forecast_30, forecast_90 }].
    For each product compute:
      - predicted_sales: sum or mean of forecast over horizon
      - growth_rate: (avg future - avg past) / avg past * 100
      - recommendation_score: combined normalized score
    Returns list of { product, predicted_sales, growth_rate, recommendation_score }, sorted by score desc.
    """
    rows = []
    pred_sales_list = []
    growth_list = []

    for product, data in forecast_results.items():
        series = data.get("series")
        fc_key = f"forecast_{horizon}"
        forecast_df = data.get(fc_key)
        if series is None or series.empty or forecast_df is None or forecast_df.empty:
            continue
        past_avg = series["y"].mean()
        col = "predicted_sales" if "predicted_sales" in forecast_df.columns else "yhat"
        future_sales = forecast_df[col]
        future_avg = float(future_sales.mean())
        predicted_total = float(future_sales.sum())
        growth_rate = compute_growth_rate(series["y"], future_sales)
        pred_sales_list.append(predicted_total)
        growth_list.append(growth_rate)
        rows.append(
            {
                "product": product,
                "predicted_sales": round(predicted_total, 2),
                "growth_rate": round(growth_rate, 2),
                "past_avg": past_avg,
                "future_avg": future_avg,
            }
        )

    if not rows:
        return []

    pred_max = max(pred_sales_list) or 1
    growth_max = max(growth_list) if growth_list else 1
    growth_min = min(growth_list) if growth_list else 0
    for r in rows:
        sales_norm = r["predicted_sales"] / pred_max if pred_max else 0
        # Normalize growth to 0-1 (growth_min..growth_max -> 0..1)
        g = r["growth_rate"]
        if growth_max > growth_min:
            growth_norm = (g - growth_min) / (growth_max - growth_min)
        else:
            growth_norm = 0.5
        r["recommendation_score"] = round(0.5 * sales_norm + 0.5 * growth_norm, 4)
        r["recommendation_score"] = min(1.0, max(0.0, r["recommendation_score"]))

    # Sort by recommendation_score descending
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


def get_recommendations(
    data_root: Optional[Path] = None,
    max_products: Optional[int] = None,
) -> list[dict]:
    """
    Run the full pipeline (load data, train Prophet per product, forecast, rank)
    and return the recommendation list.
    Each item: { "product", "predicted_sales", "growth_rate", "recommendation_score" }.
    """
    from preprocess import get_preprocessed, get_products
    from forecast import run_forecasts_for_products

    data_root = data_root or DATA_ROOT
    df = get_preprocessed(data_root=data_root)
    if df.empty:
        return []

    products = get_products(df)
    if max_products is not None and max_products > 0:
        products = products[:max_products]
    if not products:
        return []

    forecast_results = run_forecasts_for_products(
        df, products, horizons=(30, 90)
    )
    return build_recommendations(forecast_results, horizon=30)
