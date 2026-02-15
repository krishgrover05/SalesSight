# SalesSight ML pipeline

Python-based pipeline to train time-series models per product, forecast 30/90 days, evaluate (MAE, RMSE), and output a ranked recommendation list.

## Setup

```bash
cd ml_model
pip install -r requirements.txt
```

Requires: `pandas`, `numpy`, `prophet`. Prophet may need a C++ toolchain on some systems.

## Data

Expects datasets under `../data/` (or pass `data_root`):

- `superstore-sales/train.csv` — Order Date, Product Name, Category, Sales
- `store-sales-time-series-forecasting/train.csv` — date, store_nbr, family, sales
- `google-trends/trends.csv` (optional) — load via `preprocess.load_google_trends()`

Standardized schema after preprocessing: `date`, `product_name`, `category`, `sales` (aggregated per product per day).

## Training vs inference (separate)

- **Training** runs only in a dedicated script. It loads data, trains Prophet per product, and saves to `models/`. No API involved.
- **API** loads pre-trained models at startup and serves `/recommend` using inference only. No `Prophet.fit()`, no cmdstan, no retraining on requests.

**1. Train once (saves to `models/`):**

```bash
cd ml_model
python train.py
```

Produces `models/<product>.pkl` and `models/meta.json`. Run this whenever you want to refresh models.

**2. Start API (loads models once, then inference only):**

```bash
uvicorn api:app --reload
```

- **GET /health** — `{ "status": "ok", "models_loaded": true }`
- **GET /recommend** — ranked recommendation list (from loaded models; returns in &lt;1s). If models are missing, returns 503: "Models not found. Run training first."

## Usage

**Training only (recommended for API):**

```bash
python train.py
```

**Full pipeline (train + evaluate + output JSON):**

```python
from train import run_pipeline, run_training_only

run_training_only(max_products=50)  # optional limit
# or
result = run_pipeline(max_products=50)
```

**Outputs**

- `models/<product>.pkl` — Prophet model per product (used by API)
- `models/meta.json` — past_avg, last_ds per product (used by API)
- `output/recommendations.json` — from run_pipeline only
- `output/metrics.json` — MAE/RMSE from run_pipeline only

## Modules

| File | Role |
|------|------|
| `preprocess.py` | Load CSVs, standardize columns, clean, aggregate by (date, product_name) |
| `forecast.py` | Train Prophet per product, save .pkl (used by train.py only) |
| `evaluate.py` | Train/val split, MAE/RMSE (used by run_pipeline only) |
| `recommend.py` | build_recommendations from forecast results (training path) |
| `inference.py` | Load models from disk; get_recommendations_from_models() — no training |
| `train.py` | run_training_only() saves to models/; run_pipeline() for full eval |
| `api.py` | FastAPI: load models at startup; /health, /recommend (inference only) |

## Evaluation

Uses the last 30 days as validation: train on the rest, predict validation period, compute MAE and RMSE per product.
