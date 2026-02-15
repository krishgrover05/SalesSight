"""
Evaluation metrics for forecasts: MAE, RMSE.
Uses a train/validation split (last N days as validation).
"""

from typing import Optional

import numpy as np
import pandas as pd


def split_train_val(
    series: pd.DataFrame,
    val_days: int = 30,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    series: DataFrame with columns ds, y (Prophet format).
    Returns (train_series, val_series). Validation is the last val_days.
    """
    series = series.sort_values("ds").reset_index(drop=True)
    if len(series) <= val_days:
        return series, pd.DataFrame(columns=series.columns)
    split_idx = len(series) - val_days
    train = series.iloc[:split_idx]
    val = series.iloc[split_idx:]
    return train, val


def evaluate_predictions(
    actual: pd.Series,
    predicted: pd.Series,
) -> dict[str, float]:
    """
    Compute MAE and RMSE. Aligns by index if needed; drops NaN.
    """
    a = np.asarray(actual, dtype=float).ravel()
    p = np.asarray(predicted, dtype=float).ravel()
    if len(a) != len(p):
        min_len = min(len(a), len(p))
        a, p = a[:min_len], p[:min_len]
    mask = ~(np.isnan(a) | np.isnan(p))
    a, p = a[mask], p[mask]
    if len(a) == 0:
        return {"mae": float("nan"), "rmse": float("nan")}
    mae = float(np.mean(np.abs(a - p)))
    rmse = float(np.sqrt(np.mean((a - p) ** 2)))
    return {"mae": mae, "rmse": rmse}


def evaluate_product_forecast(
    series: pd.DataFrame,
    model,
    val_days: int = 30,
) -> dict[str, float]:
    """
    Split series into train/val. Predict on validation dates using the fitted model; return MAE/RMSE.
    series: Prophet format (ds, y). model: fitted Prophet model (predicts on val ds).
    """
    train, val = split_train_val(series, val_days=val_days)
    if val.empty or len(train) < 2:
        return {"mae": float("nan"), "rmse": float("nan")}
    future = val[["ds"]].copy()
    pred = model.predict(future)
    return evaluate_predictions(val["y"], pred["yhat"])


def compute_metrics_for_products(
    product_series: dict[str, pd.DataFrame],
    product_forecasts_val: dict[str, pd.DataFrame],
) -> dict[str, dict[str, float]]:
    """
    product_series: dict[product_name, series with ds, y]
    product_forecasts_val: dict[product_name, df with date/ds and predicted_sales/yhat for validation period]
    Returns dict[product_name, { "mae", "rmse" }].
    """
    out = {}
    for name, series in product_series.items():
        pred_df = product_forecasts_val.get(name)
        if pred_df is None or series.empty:
            out[name] = {"mae": float("nan"), "rmse": float("nan")}
            continue
        # Align: series has ds, y; pred has ds (or date) and yhat (or predicted_sales)
        pred_df = pred_df.copy()
        if "date" in pred_df and "ds" not in pred_df:
            pred_df["ds"] = pd.to_datetime(pred_df["date"])
        if "predicted_sales" in pred_df and "yhat" not in pred_df:
            pred_df["yhat"] = pred_df["predicted_sales"]
        merged = series[["ds", "y"]].merge(
            pred_df[["ds", "yhat"]].rename(columns={"yhat": "pred"}),
            on="ds",
            how="inner",
        )
        if merged.empty:
            out[name] = {"mae": float("nan"), "rmse": float("nan")}
        else:
            out[name] = evaluate_predictions(merged["y"], merged["pred"])
    return out
