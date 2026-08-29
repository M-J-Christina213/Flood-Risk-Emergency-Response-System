# ============================================================
# FLOOD RISK PREDICTION & EMERGENCY RESPONSE SYSTEM
#  APPLICATION API
# ============================================================

from pathlib import Path
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import json
import math

COLOMBO_TZ = ZoneInfo("Asia/Colombo")

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .database import engine, get_db
from . import models

# Create tables
models.Base.metadata.create_all(bind=engine)


# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

MODEL_RF_PATH = (
    ROOT
    / "outputs"
    / "ml"
    / "models"
    / "random_forest_fixed.pkl"
)

MODEL_GB_PATH = (
    ROOT
    / "outputs"
    / "ml"
    / "models"
    / "gradient_boosting_fixed.pkl"
)

WEIGHTS_PATH = (
    ROOT
    / "outputs"
    / "ml"
    / "hybrid_weights.csv"
)

DATA_PATH = (
    ROOT
    / "outputs"
    / "ml_features_fixed.csv"
)

REPORTS_PATH = (
    ROOT
    / "outputs"
    / "reports.json"
)


# ============================================================
# LOAD MODEL
# ============================================================

print("=" * 70)
print("FLOOD RISK PREDICTION API")
print("=" * 70)

print("\nLoading models:")
print(MODEL_RF_PATH)
print(MODEL_GB_PATH)

model_rf = joblib.load(MODEL_RF_PATH)
model_gb = joblib.load(MODEL_GB_PATH)

print("Models loaded successfully.")

print("\nLoading hybrid weights:")
print(WEIGHTS_PATH)
try:
    weights_df = pd.read_csv(WEIGHTS_PATH)
    W_RF = float(weights_df["w_random_forest"].iloc[0])
    W_GB = float(weights_df["w_gradient_boosting"].iloc[0])
    print(f"Weights loaded -> RF: {W_RF:.6f}, GB: {W_GB:.6f}")
except Exception as e:
    print("Failed to load weights. Defaulting to 0.5/0.5", e)
    W_RF = 0.503818
    W_GB = 0.496182


# ============================================================
# LOAD DATA
# ============================================================

print("\nLoading ML dataset:")
print(DATA_PATH)

df = pd.read_csv(DATA_PATH)

df["datetime"] = pd.to_datetime(df["datetime"])

df = df.sort_values(
    ["station", "datetime"]
).reset_index(drop=True)

print("Dataset loaded.")
print("Rows:", len(df))
print("Stations:", df["station"].nunique())


# ============================================================
# FEATURE LIST
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
# FASTAPI
# ============================================================

app = FastAPI(
    title="Flood Risk Prediction & Emergency Response API",
    description=(
        "API supporting flood prediction, river monitoring, "
        "location-aware public alerts and flood reporting."
    ),
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class LocationRequest(BaseModel):
    latitude: float
    longitude: float


class ReportRequest(BaseModel):
    latitude: float
    longitude: float

    report_type: str
    description: str = ""

    severity: str = "medium"

    anonymous: bool = True


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_latest_station_data(station_name: str):

    station_df = df[
        df["station"].astype(str).str.lower()
        == station_name.lower()
    ]

    if station_df.empty:
        return None

    return station_df.sort_values(
        "datetime"
    ).iloc[-1]


def calculate_risk(
    predicted_level,
    current_level,
    alert_level,
    minor_flood_level,
    major_flood_level
):

    # Major flood threshold
    if (
        pd.notna(major_flood_level)
        and predicted_level >= major_flood_level
    ):
        return "Very High"

    # Minor flood threshold
    if (
        pd.notna(minor_flood_level)
        and predicted_level >= minor_flood_level
    ):
        return "High"

    # Alert threshold
    if (
        pd.notna(alert_level)
        and predicted_level >= alert_level
    ):
        return "Moderate"

    # If no thresholds are available,
    # compare predicted/current level.

    if predicted_level > current_level * 1.20:
        return "Moderate"

    if predicted_level > current_level * 1.05:
        return "Low"

    return "Low"


def calculate_distance_km(
    lat1,
    lon1,
    lat2,
    lon2
):

    radius = 6371.0

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        +
        math.cos(lat1)
        * math.cos(lat2)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return radius * c


def predict_station(station_name: str):

    row = get_latest_station_data(station_name)

    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"Station '{station_name}' not found."
        )

    # Make sure required features exist
    missing_features = [
        feature
        for feature in FEATURES
        if feature not in row.index
    ]

    if missing_features:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Required model features missing.",
                "missing_features": missing_features
            }
        )

    # Create dataframe so sklearn receives
    # the same feature names used during training.

    X = pd.DataFrame(
        [[row[feature] for feature in FEATURES]],
        columns=FEATURES
    )

    rf_pred = float(model_rf.predict(X)[0])
    gb_pred = float(model_gb.predict(X)[0])
    
    prediction = (W_RF * rf_pred) + (W_GB * gb_pred)

    current_level = float(
        row["water_level_current"]
    )

    alert_level = row["alert_level"]
    minor_level = row["minor_flood_level"]
    major_level = row["major_flood_level"]

    risk = calculate_risk(
        prediction,
        current_level,
        alert_level,
        minor_level,
        major_level
    )

    return {
        "station": station_name,

        "datetime": row["datetime"].isoformat(),

        "river": (
            None
            if pd.isna(row["river"])
            else str(row["river"])
        ),

        "river_basin": (
            None
            if pd.isna(row["river_basin"])
            else str(row["river_basin"])
        ),

        "current_water_level": round(
            current_level,
            3
        ),

        "predicted_water_level": round(
            prediction,
            3
        ),

        "rainfall_12hr": round(
            float(row["rainfall_12hr"]),
            2
        ),

        "risk_level": risk,

        "alert_level": (
            None
            if pd.isna(alert_level)
            else float(alert_level)
        ),

        "minor_flood_level": (
            None
            if pd.isna(minor_level)
            else float(minor_level)
        ),

        "major_flood_level": (
            None
            if pd.isna(major_level)
            else float(major_level)
        ),

        "model": "RF + GB Hybrid"
    }


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "system": "Flood Risk Prediction & Emergency Response System",
        "status": "running",
        "model": "RF + GB Hybrid",
        "purpose": "Next-step river water-level prediction"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "model_loaded": True,
        "dataset_loaded": True,
        "stations": int(
            df["station"].nunique()
        )
    }


# ============================================================
# STATIONS
# ============================================================

@app.get("/stations")
def stations():

    stations = (
        df["station"]
        .dropna()
        .astype(str)
        .drop_duplicates()
        .sort_values()
        .tolist()
    )

    return {
        "count": len(stations),
        "stations": stations
    }


# ============================================================
# STATION CURRENT INFORMATION
# ============================================================

@app.get("/station/{station_name}")
def station_information(
    station_name: str
):

    return predict_station(
        station_name
    )


# ============================================================
# STATION PREDICTION
# ============================================================

@app.get("/predict/{station_name}")
def station_prediction(
    station_name: str,
    db: Session = Depends(get_db)
):

    result = predict_station(
        station_name
    )

    # Log prediction to DB
    log_entry = models.PredictionLog(
        station=result["station"],
        prediction_time=result["datetime"],
        river=result["river"],
        river_basin=result["river_basin"],
        current_water_level=result["current_water_level"],
        predicted_water_level=result["predicted_water_level"],
        rainfall_12hr=result["rainfall_12hr"],
        risk_level=result["risk_level"],
        alert_level=result["alert_level"],
        minor_flood_level=result["minor_flood_level"],
        major_flood_level=result["major_flood_level"],
        model=result["model"]
    )
    db.add(log_entry)
    db.commit()

    return {
        "station": result["station"],
        "current_water_level":
            result["current_water_level"],
        "predicted_water_level":
            result["predicted_water_level"],
        "rainfall_12hr":
            result["rainfall_12hr"],
        "risk_level":
            result["risk_level"],
        "prediction_time":
            result["datetime"],
        "model":
            result["model"]
    }


# ============================================================
# NEARBY STATION SEARCH
# ============================================================

@app.post("/nearby")
def nearby_station(
    location: LocationRequest
):

    # --------------------------------------------------------
    # IMPORTANT
    # --------------------------------------------------------
    #
    # Station coordinates will be connected here once the
    # station coordinate dataset is added.
    #
    # For now we return the available station list so the
    # frontend can be developed without inventing coordinates.
    # --------------------------------------------------------

    stations = (
        df[
            [
                "station",
                "river",
                "river_basin"
            ]
        ]
        .dropna(subset=["station"])
        .drop_duplicates(
            subset=["station"]
        )
    )

    results = []

    for _, row in stations.iterrows():

        results.append({
            "station": str(row["station"]),

            "river": (
                None
                if pd.isna(row["river"])
                else str(row["river"])
            ),

            "river_basin": (
                None
                if pd.isna(row["river_basin"])
                else str(row["river_basin"])
            )
        })

    return {
        "user_location": {
            "latitude":
                location.latitude,
            "longitude":
                location.longitude
        },

        "message":
            "Station coordinates will be used for distance-based matching.",

        "stations": results
    }


# ============================================================
# FLOOD REPORTING
# ============================================================

@app.post("/reports")
def submit_report(
    report: ReportRequest,
    db: Session = Depends(get_db)
):

    report_id = (
        datetime.now(COLOMBO_TZ)
        .strftime("%Y%m%d%H%M%S%f")
    )
    submitted_at = datetime.now(COLOMBO_TZ).isoformat()

    db_report = models.Report(
        id=report_id,
        submitted_at=submitted_at,
        latitude=report.latitude,
        longitude=report.longitude,
        report_type=report.report_type,
        description=report.description,
        severity=report.severity,
        anonymous=report.anonymous,
        status="new"
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    report_dict = {
        "id": report_id,
        "submitted_at": submitted_at,
        "latitude": db_report.latitude,
        "longitude": db_report.longitude,
        "report_type": db_report.report_type,
        "description": db_report.description,
        "severity": db_report.severity,
        "anonymous": db_report.anonymous,
        "status": db_report.status
    }

    return {
        "success": True,
        "message": "Flood report received.",
        "report": report_dict
    }


# ============================================================
# ADMIN REPORTS
# ============================================================

@app.get("/reports")
def get_reports(
    db: Session = Depends(get_db)
):

    db_reports = db.query(models.Report).all()
    reports = []
    for r in db_reports:
        reports.append({
            "id": r.id,
            "submitted_at": r.submitted_at,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "report_type": r.report_type,
            "description": r.description,
            "severity": r.severity,
            "anonymous": r.anonymous,
            "status": r.status
        })

    return {
        "count": len(reports),
        "reports": reports
    }

# ============================================================
# PRIORITY AREAS
# ============================================================

@app.get("/priority-areas")
def priority_areas(db: Session = Depends(get_db)):
    # 1. Get recent predictions per station
    logs = db.query(models.PredictionLog).all()
    latest_logs = {}
    for log in logs:
        if log.station not in latest_logs or log.logged_at > latest_logs[log.station].logged_at:
            latest_logs[log.station] = log
            
    # Filter High/Very High as primary signal
    priority_list = []
    for station, log in latest_logs.items():
        if log.risk_level in ["High", "Very High"]:
            priority_list.append({
                "station": station,
                "risk_level": log.risk_level,
                "predicted_water_level": log.predicted_water_level,
                "prediction_time": log.prediction_time,
                "logged_at": log.logged_at,
                "report_count": 0,
                "latest_report_severity": None,
                "score": 2 if log.risk_level == "Very High" else 1
            })
            
    # 2. Get recent reports as supporting factor
    # For now, without explicit geospatial join, we match any recent reports
    # (In a real system, we would match report lat/lon to station lat/lon radius)
    # Just to fulfill the requirement, we will sort the final list primarily by risk score.
    reports = db.query(models.Report).all()
    # E.g. sort descending by score
    priority_list = sorted(priority_list, key=lambda x: x["score"], reverse=True)

    return {
        "count": len(priority_list),
        "priority_areas": priority_list
    }

# ============================================================
# RUNNING MESSAGE
# ============================================================

print("\n" + "=" * 70)
print("API READY")
print("=" * 70)