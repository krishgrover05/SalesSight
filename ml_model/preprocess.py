"""
Load and preprocess sales datasets into a unified schema.
Standardized columns: date, product_name, category, sales.
"""

import os
from pathlib import Path
from typing import Optional

import pandas as pd

# Default data root (project data/ folder)
DATA_ROOT = Path(__file__).resolve().parent.parent / "data"

# Standard output columns
STANDARD_COLUMNS = ["date", "product_name", "category", "sales"]


def _load_superstore(train_path: Path) -> pd.DataFrame:
    """Load superstore-sales/train.csv. Columns: Order Date, Product Name, Category, Sales."""
    df = pd.read_csv(train_path)
    df = df.rename(
        columns={
            "Order Date": "date",
            "Product Name": "product_name",
            "Category": "category",
            "Sales": "sales",
        }
    )
    df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
    df = df[STANDARD_COLUMNS]
    return df


def _load_store_sales(train_path: Path) -> pd.DataFrame:
    """Load store-sales-time-series-forecasting/train.csv. Columns: date, family, sales."""
    df = pd.read_csv(train_path)
    df = df.rename(columns={"family": "product_name"})
    df["category"] = df["product_name"]
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df[["date", "product_name", "category", "sales"]]
    return df


def load_and_standardize(
    data_root: Optional[os.PathLike] = None,
    superstore_path: Optional[os.PathLike] = None,
    store_sales_path: Optional[os.PathLike] = None,
) -> pd.DataFrame:
    """
    Load all available datasets and return a single DataFrame with standard columns.
    """
    root = Path(data_root) if data_root else DATA_ROOT
    frames = []

    # 1) Superstore
    path = superstore_path or root / "superstore-sales" / "train.csv"
    if path.exists():
        df = _load_superstore(path)
        frames.append(df)

    # 2) Store sales time series (aggregate over stores: sum sales per date per family)
    path = store_sales_path or root / "store-sales-time-series-forecasting" / "train.csv"
    if path.exists():
        df = _load_store_sales(path)
        # Aggregate by date + product_name (family) across stores
        df = df.groupby(["date", "product_name", "category"], as_index=False)["sales"].sum()
        frames.append(df)

    if not frames:
        return pd.DataFrame(columns=STANDARD_COLUMNS)

    combined = pd.concat(frames, ignore_index=True)
    return combined


def clean_and_aggregate(df: pd.DataFrame) -> pd.DataFrame:
    """
    - Convert date to datetime
    - Drop rows with missing date, product_name, or sales
    - Fill missing category with 'Unknown'
    - Aggregate sales per product per day (sum)
    """
    if df.empty:
        return df.copy()

    out = df.copy()
    # Dates are already parsed in loaders; ensure datetime
    if out["date"].dtype != "datetime64[ns]":
        out["date"] = pd.to_datetime(out["date"], errors="coerce")
    out = out.dropna(subset=["date", "product_name", "sales"])
    out["category"] = out["category"].fillna("Unknown").astype(str)
    out["sales"] = pd.to_numeric(out["sales"], errors="coerce").fillna(0)

    # Aggregate: one row per (date, product_name) with sum(sales)
    out = (
        out.groupby(["date", "product_name", "category"], as_index=False)["sales"]
        .sum()
        .sort_values(["product_name", "date"])
        .reset_index(drop=True)
    )
    return out


def get_preprocessed(
    data_root: Optional[os.PathLike] = None,
    superstore_path: Optional[os.PathLike] = None,
    store_sales_path: Optional[os.PathLike] = None,
) -> pd.DataFrame:
    """
    Load, standardize, clean, and aggregate. Returns DataFrame with columns:
    date, product_name, category, sales (one row per product per day).
    """
    df = load_and_standardize(
        data_root=data_root,
        superstore_path=superstore_path,
        store_sales_path=store_sales_path,
    )
    return clean_and_aggregate(df)


def get_products(df: pd.DataFrame) -> list[str]:
    """Return sorted list of unique product names."""
    return sorted(df["product_name"].unique().tolist())


def load_google_trends(data_root: Optional[os.PathLike] = None) -> pd.DataFrame:
    """
    Optional: load Google Trends data (location, year, category, rank, query).
    Can be used as an external signal; not merged into main pipeline by default.
    """
    root = Path(data_root) if data_root else DATA_ROOT
    path = root / "google-trends" / "trends.csv"
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


if __name__ == "__main__":
    # Inspect datasets
    df = get_preprocessed()
    print("Shape:", df.shape)
    print("Columns:", df.columns.tolist())
    print("Date range:", df["date"].min(), "to", df["date"].max())
    products = get_products(df)
    print("Number of products:", len(products))
    print("Sample products:", products[:10])
