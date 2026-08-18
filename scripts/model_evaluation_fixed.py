from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

print("=" * 70)
print("STEP 13 - RETRAIN MODELS WITH CORRECT NEXT-STEP TARGET")
print("=" * 70)

# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

DATA_FILE = ROOT / "outputs" / "ml_features_fixed.csv"

OUTPUT_DIR = ROOT / "outputs" / "ml"

MODEL_DIR = OUTPUT_DIR / "models"
PLOT_DIR = OUTPUT_DIR / "plots"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PLOT_DIR.mkdir(parents=True, exist_ok=True)

RESULT_FILE = OUTPUT_DIR / "model_results_fixed.csv"
PREDICTION_FILE = OUTPUT_DIR / "model_predictions_fixed.csv"

# ============================================================
# LOAD DATA
# ============================================================

print("\nLoading:")
print(DATA_FILE)

df = pd.read_csv(DATA_FILE)

df["datetime"] = pd.to_datetime(df["datetime"])

df = df.sort_values(
    ["station", "datetime"]
).reset_index(drop=True)

print("\nDataset shape:")
print(df.shape)

print("\nDate range:")
print(df["datetime"].min())
print(df["datetime"].max())

# ============================================================
# FEATURES
# ============================================================

features = [
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

target = "target_water_level"

features = [
    f for f in features
    if f in df.columns
]

print("\nFeatures used:")

for feature in features:
    print(" -", feature)

# ============================================================
# MODEL DATA
# ============================================================

model_df = df[
    features + [target, "datetime"]
].copy()

model_df = model_df.dropna()

print("\nRows after removing missing values:")
print(len(model_df))

# ============================================================
# TIME-BASED SPLIT
# ============================================================

print("\n" + "=" * 70)
print("TIME-BASED DATA SPLIT")
print("=" * 70)

train = model_df[
    model_df["datetime"] < "2025-01-01"
].copy()

test = model_df[
    model_df["datetime"] >= "2025-01-01"
].copy()

print("\nTraining data:")
print(train.shape)

print("\nTesting data:")
print(test.shape)

print("\nTraining period:")
print(
    train["datetime"].min(),
    "to",
    train["datetime"].max()
)

print("\nTesting period:")
print(
    test["datetime"].min(),
    "to",
    test["datetime"].max()
)

# ============================================================
# X / Y
# ============================================================

X_train = train[features]
y_train = train[target]

X_test = test[features]
y_test = test[target]

# ============================================================
# RANDOM FOREST
# ============================================================

print("\n" + "=" * 70)
print("RANDOM FOREST")
print("=" * 70)

rf = RandomForestRegressor(
    n_estimators=200,
    max_depth=20,
    random_state=42,
    n_jobs=-1
)

print("\nTraining Random Forest...")

rf.fit(
    X_train,
    y_train
)

print("Making predictions...")

rf_pred = rf.predict(X_test)

rf_mae = mean_absolute_error(
    y_test,
    rf_pred
)

rf_rmse = np.sqrt(
    mean_squared_error(
        y_test,
        rf_pred
    )
)

rf_r2 = r2_score(
    y_test,
    rf_pred
)

print("\nRandom Forest Results:")

print("MAE :", round(rf_mae, 4))
print("RMSE:", round(rf_rmse, 4))
print("R²  :", round(rf_r2, 4))

# ============================================================
# XGBOOST
# ============================================================

print("\n" + "=" * 70)
print("XGBOOST")
print("=" * 70)

xgb = XGBRegressor(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42,
    n_jobs=-1
)

print("\nTraining XGBoost...")

xgb.fit(
    X_train,
    y_train
)

print("Making predictions...")

xgb_pred = xgb.predict(X_test)

xgb_mae = mean_absolute_error(
    y_test,
    xgb_pred
)

xgb_rmse = np.sqrt(
    mean_squared_error(
        y_test,
        xgb_pred
    )
)

xgb_r2 = r2_score(
    y_test,
    xgb_pred
)

print("\nXGBoost Results:")

print("MAE :", round(xgb_mae, 4))
print("RMSE:", round(xgb_rmse, 4))
print("R²  :", round(xgb_r2, 4))

# ============================================================
# MODEL COMPARISON
# ============================================================

results_df = pd.DataFrame({
    "Model": [
        "Random Forest",
        "XGBoost"
    ],

    "MAE": [
        rf_mae,
        xgb_mae
    ],

    "RMSE": [
        rf_rmse,
        xgb_rmse
    ],

    "R2": [
        rf_r2,
        xgb_r2
    ]
})

print("\n" + "=" * 70)
print("MODEL COMPARISON")
print("=" * 70)

print(
    results_df.to_string(
        index=False
    )
)

# ============================================================
# BEST MODEL
# ============================================================

best_model = results_df.loc[
    results_df["RMSE"].idxmin()
]

print("\nBest model based on RMSE:")
print(best_model["Model"])

# ============================================================
# SAVE RESULTS
# ============================================================

results_df.to_csv(
    RESULT_FILE,
    index=False
)

print("\nSaved:")
print(RESULT_FILE)

# ============================================================
# SAVE PREDICTIONS
# ============================================================

prediction_df = test[
    [
        "datetime"
    ]
].copy()

prediction_df["actual_water_level"] = y_test.values

prediction_df["random_forest_prediction"] = rf_pred

prediction_df["xgboost_prediction"] = xgb_pred

prediction_df.to_csv(
    PREDICTION_FILE,
    index=False
)

print("\nSaved:")
print(PREDICTION_FILE)

# ============================================================
# SAVE MODELS
# ============================================================

rf_file = MODEL_DIR / "random_forest_fixed.pkl"

xgb_file = MODEL_DIR / "xgboost_fixed.pkl"

joblib.dump(
    rf,
    rf_file
)

joblib.dump(
    xgb,
    xgb_file
)

print("\nSaved:")
print(rf_file)

print("\nSaved:")
print(xgb_file)

# ============================================================
# FEATURE IMPORTANCE
# ============================================================

importance_df = pd.DataFrame({
    "feature": features,
    "importance": rf.feature_importances_
})

importance_df = importance_df.sort_values(
    "importance",
    ascending=False
)

importance_file = OUTPUT_DIR / "feature_importance_fixed.csv"

importance_df.to_csv(
    importance_file,
    index=False
)

print("\n" + "=" * 70)
print("TOP FEATURES")
print("=" * 70)

print(
    importance_df.head(10).to_string(
        index=False
    )
)

print("\nSaved:")
print(importance_file)

# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 70)
print("STEP 13 COMPLETE")
print("=" * 70)

print("\nFiles created:")

print(" - model_results_fixed.csv")
print(" - model_predictions_fixed.csv")
print(" - feature_importance_fixed.csv")
print(" - models/random_forest_fixed.pkl")
print(" - models/xgboost_fixed.pkl")