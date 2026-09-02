from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime, timezone
from .database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, index=True)
    submitted_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    report_type = Column(String, nullable=False)
    description = Column(String, default="")
    severity = Column(String, default="medium")
    anonymous = Column(Boolean, default=True)
    status = Column(String, default="new")

class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    station = Column(String, index=True, nullable=False)
    prediction_time = Column(String, nullable=False)
    river = Column(String, nullable=True)
    river_basin = Column(String, nullable=True)
    current_water_level = Column(Float, nullable=False)
    predicted_water_level = Column(Float, nullable=False)
    rainfall_12hr = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    alert_level = Column(Float, nullable=True)
    minor_flood_level = Column(Float, nullable=True)
    major_flood_level = Column(Float, nullable=True)
    model = Column(String, nullable=False)
    logged_at = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    station = Column(String, nullable=True)
    river = Column(String, nullable=True)
    message = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    location = Column(String, nullable=True)
    status = Column(String, default="Active")
    time = Column(String, default=lambda: datetime.now(timezone.utc).isoformat())
