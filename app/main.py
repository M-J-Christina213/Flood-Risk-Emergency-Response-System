# ============================================================
# FLOOD RISK PREDICTION & EMERGENCY RESPONSE SYSTEM
#  APPLICATION API
# ============================================================

from pathlib import Path
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
import json
import math
import os
import hashlib

COLOMBO_TZ = ZoneInfo("Asia/Colombo")

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal
from uuid import uuid4
from sqlalchemy.orm import Session

from .database import engine, get_db
from . import models
from .auth import router as auth_router, staff, admin
from .workflow_api import router as workflow_router
from . import workflow
from .ml_pipeline import FEATURES as SHARED_FEATURES, risk_label, STATIONS

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

# DEPLOYMENT MODEL: Random Forest
# Justification: Phase 2.5 validation showed RF has significantly higher
# Very High Risk Recall (56.09%) vs Hybrid (45.12%).
# The Hybrid's 0.29% RMSE improvement does not justify the loss of
# severe-risk detection capability in an emergency-response context.
# The Gradient Boosting model and hybrid weights are preserved in
# outputs/ml/ for FYP comparison and academic documentation.

print("\nLoading deployed model (Random Forest):")
print(MODEL_RF_PATH)

model_rf = joblib.load(MODEL_RF_PATH)
MODEL_RF_SHA256 = hashlib.sha256(MODEL_RF_PATH.read_bytes()).hexdigest()
# Single-row inference avoids starting a worker pool for every station request.
model_rf.n_jobs = 1

print("Random Forest model loaded successfully.")
print("Deployment model: random_forest_fixed.pkl")


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
app.include_router(auth_router)
app.include_router(workflow_router)
assert FEATURES == SHARED_FEATURES
assert list(model_rf.feature_names_in_) == FEATURES


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv('FLOOD_CORS_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODELS
# ============================================================

class LocationRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)


class ReportRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)

    report_type: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=5000)

    severity: str = "medium"

    anonymous: bool = True
    client_request_id: str | None = Field(default=None, min_length=8, max_length=100, pattern=r'^[A-Za-z0-9_-]+$')

class AlertRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    station: str = ""
    river: str = ""
    message: str = Field(min_length=1, max_length=5000)
    severity: str
    location: str = ""
    status: Literal["Active", "Revoked"] = "Active"


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

    return risk_label(predicted_level, [alert_level, minor_flood_level, major_flood_level])


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


def predict_station(station_name: str, db=None):

    if db is not None:
        # Replay remains a separate operations view; it cannot replace manual data.
        events = [e for e in workflow.records(db, 'prediction_event')
                  if e['station'].lower() == station_name.lower() and e.get('source_mode') == 'manual_upload']
        if events:
            latest = max(events, key=lambda e: e['observation_time'])
            if latest['status'] != 'success':
                raise HTTPException(422, {'message':'Latest imported observation failed inference', 'event':latest})
            # Freshness ages even when nobody imports new data.
            age = (datetime.now(timezone.utc) - datetime.fromisoformat(latest['observation_time'])).total_seconds()
            fresh = 0 <= age <= float(os.getenv('FLOOD_MAX_AGE_SECONDS', '21600'))
            latest['freshness_status'] = 'fresh' if fresh else 'stale'
            latest['predictive_alert_eligible'] = fresh
            return latest

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

    prediction = float(model_rf.predict(X)[0])

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
    display_scale = 0.3048 if str(row['unit']) == 'ft' else 1.0

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
            current_level * display_scale,
            3
        ),

        "predicted_water_level": round(
            prediction * display_scale,
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
            else float(alert_level) * display_scale
        ),

        "minor_flood_level": (
            None
            if pd.isna(minor_level)
            else float(minor_level) * display_scale
        ),

        "major_flood_level": (
            None
            if pd.isna(major_level)
            else float(major_level) * display_scale
        ),

        "model": "Random Forest",
        "model_version": "random_forest_fixed.pkl",
        "prediction_generated_at": datetime.now(COLOMBO_TZ).isoformat(),
        "observation_time": row["datetime"].tz_localize(COLOMBO_TZ).isoformat(),
        "forecast_target_time": None,
        "forecast_horizon": "next_observation_variable",
        "source_mode": "historical_replay",
        "freshness_status": "stale",
        "predictive_alert_eligible": False,
        "prototype": True,
        "supported_project_coverage": station_name in STATIONS,
        "input_validation": "legacy precomputed features; zero-filled rainfall and mixed units require review",
        "level_unit": 'm' if str(row['unit']) in ['m','ft'] else 'unverified',
        "source_level_unit": str(row['unit'])
    }


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "system": "Flood Risk Prediction & Emergency Response System",
        "status": "running",
        "model": "Random Forest (random_forest_fixed.pkl)",
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
        "stations": int(df["station"].nunique()),
        "data_source": "Historical CSV (not a live feed)",
        "latest_observation": df["datetime"].max().isoformat(),
        "model": "Random Forest",
        "model_version": MODEL_RF_PATH.name
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
    station_name: str,
    db: Session = Depends(get_db)
):

    return predict_station(
        station_name, db
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
        station_name, db
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

    return dict(result, prediction_time=result["datetime"])


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
    request_key = 'report_request:' + report.client_request_id if report.client_request_id else None
    if request_key:
        prior = workflow.get(db, request_key)
        if prior:
            if prior['payload'] != report.model_dump():
                raise HTTPException(409, 'Request ID already used with different report content')
            return prior['response']
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
    db.flush()

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

    response = {
        "success": True,
        "message": "Flood report received.",
        "report": report_dict
    }
    workflow.audit(db, report_id, 'public', 'submitted', {'status':'submitted'})
    if request_key:
        workflow.put(db, request_key, 'report_request', {'payload':report.model_dump(), 'response':response})
    db.commit()
    return response


# ============================================================
# ADMIN REPORTS
# ============================================================

@app.get("/reports")
def get_reports(
    db: Session = Depends(get_db),
    user = Depends(staff)
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
# ALERTS
# ============================================================

@app.post("/alerts")
def create_alert(
    alert: AlertRequest,
    db: Session = Depends(get_db),
    user = Depends(staff)
):
    alert_id = "AL" + uuid4().hex
    db_alert = models.Alert(
        id=alert_id,
        title=alert.title,
        station=alert.station,
        river=alert.river,
        message=alert.message,
        severity=alert.severity,
        location=alert.location,
        status=alert.status,
        time=datetime.now(COLOMBO_TZ).isoformat()
    )
    db.add(db_alert)
    workflow.audit(db, alert_id, user.username, 'manual_alert_created', {'prototype':True})
    db.commit()
    db.refresh(db_alert)
    
    return {
        "success": True,
        "message": "Alert created successfully.",
        "alert": db_alert
    }

@app.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    db_alerts = db.query(models.Alert).order_by(models.Alert.time.desc()).all()
    alerts = []
    for a in db_alerts:
        metadata = workflow.get(db, 'alert_metadata:' + a.id) or {
            'source_mode':'manual_warning', 'prototype':True, 'forecast_target_time':None,
            'model_version':None, 'observation_time':None, 'simulation':False}
        alerts.append({c.name:getattr(a,c.name) for c in a.__table__.columns} | {'metadata':metadata})
    return {
        "count": len(db_alerts),
        "alerts": alerts
    }

# ============================================================
# PRIORITY AREAS
# ============================================================

@app.get("/priority-areas")
def priority_areas(db: Session = Depends(get_db), user = Depends(staff)):
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

class ReportStatusRequest(BaseModel):
    status: Literal["new", "verified", "dispatched", "resolved"]


@app.patch("/reports/{report_id}/status")
def update_report_status(report_id: str, update: ReportStatusRequest, db: Session = Depends(get_db), user = Depends(staff)):
    report = db.get(models.Report, report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found.")
    try:
        workflow.transition_report(db, report, workflow.LEGACY_STATUS[update.status], user)
    except ValueError as exc:
        raise HTTPException(409, str(exc))
    except PermissionError as exc:
        raise HTTPException(403, str(exc))
    return {"success": True, "report": {"id": report.id, "status": report.status}}


@app.patch("/alerts/{alert_id}/revoke")
def revoke_alert(alert_id: str, db: Session = Depends(get_db), user = Depends(staff)):
    alert = db.get(models.Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.status = "Revoked"
    metadata = workflow.get(db, 'alert_metadata:' + alert.id)
    if metadata:
        metadata['lifecycle'] = 'revoked'
        workflow.put(db, 'alert_metadata:' + alert.id, 'alert_metadata', metadata)
    workflow.audit(db, alert.id, user.username, 'revoked', {})
    db.commit()
    return {"success": True, "alert": {"id": alert.id, "status": alert.status}}
