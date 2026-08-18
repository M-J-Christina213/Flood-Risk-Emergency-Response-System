# ============================================================
# FLOOD PREDICTION API
# ============================================================

from pathlib import Path
import pandas as pd
import joblib
import numpy as np

from fastapi import FastAPI
from pydantic import BaseModel


# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    ROOT
    / "outputs"
    / "ml"
    / "models"
    / "flood_prediction_model.pkl"
)


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 70)
print("FLOOD PREDICTION API")
print("=" * 70)

print("\nLoading model:")
print(MODEL_PATH)

model = joblib.load(MODEL_PATH)

print("Model loaded successfully.")


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Flood Prediction API",
    description="Machine learning API for next-step river water-level prediction",
    version="1.0.0"
)


# ============================================================
# INPUT DATA MODEL
# ============================================================

class PredictionRequest(BaseModel):

    water_level_current: float
    water_level_previous: float

    water_level_lag_1: float
    water_level_lag_2: float
    water_level_lag_3: float

    rainfall_12hr: float
    rainfall_lag_1: float
    rainfall_lag_2: float

    rainfall_rolling_3: float
    water_level_rolling_3: float

    hour_sin: float
    hour_cos: float

    month_sin: float
    month_cos: float

    alert_level: float
    minor_flood_level: float
    major_flood_level: float


# ============================================================
# FEATURE ORDER
# ============================================================

FEATURES = [
    "water_level_current",
    "water_level_previous",

    "water_level_lag_1",
    "water_level_lag_2",
    "water_level_lag_3",

    "rainfall_12hr",
    "rainfall_lag_1",
    "rainfall_lag_2",

    "rainfall_rolling_3",
    "water_level_rolling_3",

    "hour_sin",
    "hour_cos",

    "month_sin",
    "month_cos",

    "alert_level",
    "minor_flood_level",
    "major_flood_level"
]


# ============================================================
# HOME ENDPOINT
# ============================================================

@app.get("/")
def home():

    return {
        "system": "Flood Prediction API",
        "status": "running",
        "model": "Random Forest",
        "purpose": "Next-step river water-level prediction"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "model_loaded": True
    }


# ============================================================
# PREDICTION ENDPOINT
# ============================================================

@app.post("/predict")
def predict(request: PredictionRequest):

    # Convert request to feature array

    values = [
        getattr(request, feature)
        for feature in FEATURES
    ]

    X = np.array(values).reshape(1, -1)

    # Make prediction

    prediction = model.predict(X)[0]

    prediction = float(prediction)

    return {
        "predicted_water_level": round(prediction, 3),
        "unit": "m"
    }


# ============================================================
# COMPLETE
# ============================================================

print("\nAPI ready.")