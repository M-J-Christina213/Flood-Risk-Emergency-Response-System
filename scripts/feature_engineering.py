from pathlib import Path
import pandas as pd
import numpy as np

# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = ROOT / "outputs" / "clean_water_levels.csv"
OUTPUT_FILE = ROOT / "outputs" / "ml_features.csv"

print("=" * 70)
print("FEATURE ENGINEERING")
print("=" * 70)

print(f"\nLoading:")
print(INPUT_FILE)

# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv(INPUT_FILE)

df["datetime"] = pd.to_datetime(df["datetime"])

# Sort by station and time
df = df.sort_values(["station", "datetime"]).reset_index(drop=True)

print(f"\nOriginal rows: {len(df)}")

# ============================================================
# TIME FEATURES
# ============================================================

df["hour"] = df["datetime"].dt.hour
df["day"] = df["datetime"].dt.day
df["month"] = df["datetime"].dt.month
df["day_of_week"] = df["datetime"].dt.dayofweek

# Cyclic time features
df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)

# ============================================================
# LAG FEATURES
# ============================================================

group = df.groupby("station")

# Previous water levels
df["water_level_lag_1"] = group["water_level_current"].shift(1)
df["water_level_lag_2"] = group["water_level_current"].shift(2)
df["water_level_lag_3"] = group["water_level_current"].shift(3)

# Previous rainfall
df["rainfall_lag_1"] = group["rainfall_12hr"].shift(1)
df["rainfall_lag_2"] = group["rainfall_12hr"].shift(2)

# ============================================================
# ROLLING FEATURES
# ============================================================

df["rainfall_rolling_3"] = (
    group["rainfall_12hr"]
    .transform(lambda x: x.rolling(3).mean())
)

df["water_level_rolling_3"] = (
    group["water_level_current"]
    .transform(lambda x: x.rolling(3).mean())
)

# ============================================================
# TARGET
# ============================================================

# Next water level = prediction target
df["target_water_level"] = (
    group["water_level_current"].shift(-1)
)

# ============================================================
# REMOVE ROWS WITH MISSING FEATURES
# ============================================================

feature_columns = [
    "water_level_current",
    "rainfall_12hr",
    "hour",
    "day",
    "month",
    "day_of_week",
    "hour_sin",
    "hour_cos",
    "month_sin",
    "month_cos",
    "water_level_lag_1",
    "water_level_lag_2",
    "water_level_lag_3",
    "rainfall_lag_1",
    "rainfall_lag_2",
    "rainfall_rolling_3",
    "water_level_rolling_3",
    "target_water_level"
]

df_ml = df.dropna(subset=feature_columns).copy()

# ============================================================
# SAVE
# ============================================================

df_ml.to_csv(OUTPUT_FILE, index=False)

print("\n" + "=" * 70)
print("FEATURE ENGINEERING COMPLETE")
print("=" * 70)

print(f"\nOriginal rows: {len(df)}")
print(f"ML rows:       {len(df_ml)}")
print(f"Features:      {len(feature_columns) - 1}")

print("\nFeatures:")
for feature in feature_columns[:-1]:
    print(f"  - {feature}")

print("\nTarget:")
print("  - target_water_level")

print(f"\nSaved:")
print(OUTPUT_FILE)

print("\nPreview:")
print(
    df_ml[
        [
            "datetime",
            "station",
            "water_level_current",
            "rainfall_12hr",
            "water_level_lag_1",
            "water_level_lag_2",
            "water_level_lag_3",
            "target_water_level"
        ]
    ].head(10)
)