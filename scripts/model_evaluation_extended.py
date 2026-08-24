from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
    ExtraTreesRegressor,
)
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from xgboost import XGBRegressor

print("=" * 70)
print("STEP 13 EXTENDED - ALL INDIVIDUAL MODELS")
print("Random Forest | XGBoost | Gradient Boosting | Extra Trees")
print("=" * 70)
print()
print("IMPORTANT: This script writes ONLY to new _extended output files.")
print("Existing baseline files are NOT modified.")

# ============================================================
# BASELINE REFERENCE VALUES
# Source: outputs/ml/model_results_fixed.csv
# These values must be reproduced to confirm that the pipeline,
# dataset, and features are unchanged.
# ============================================================

BASELINE_RF_MAE  = 0.4109845369802114
BASELINE_RF_RMSE = 0.744538442819179
BASELINE_RF_R2   = 0.9143501791363491

BASELINE_XGB_MAE  = 0.4134886146354753
BASELINE_XGB_RMSE = 0.7824223476332663
BASELINE_XGB_R2   = 0.9054122927925115

# Tolerance for floating-point comparison
# A difference of more than this indicates a pipeline or data change
TOLERANCE = 1e-6

# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

DATA_FILE = ROOT / "outputs" / "ml_features_fixed.csv"

OUTPUT_DIR = ROOT / "outputs" / "ml"
MODEL_DIR  = OUTPUT_DIR / "models"
PLOT_DIR   = OUTPUT_DIR / "plots"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PLOT_DIR.mkdir(parents=True, exist_ok=True)

# New output files — do NOT overwrite existing baseline files
RESULT_FILE     = OUTPUT_DIR / "model_results_extended.csv"
PREDICTION_FILE = OUTPUT_DIR / "model_predictions_extended.csv"
IMPORTANCE_FILE = OUTPUT_DIR / "feature_importance_extended.csv"

# Existing baseline files (read for reference only — never written here)
BASELINE_RESULT_FILE = OUTPUT_DIR / "model_results_fixed.csv"

# ============================================================
# VERIFY DATA FILE EXISTS
# ============================================================

if not DATA_FILE.exists():
    raise FileNotFoundError(
        f"\nDataset not found: {DATA_FILE}"
        "\nPlease run fix_target.py (Step 12) first."
    )

# ============================================================
# LOAD DATA
# ============================================================

print("\nLoading:")
print(DATA_FILE)

df = pd.read_csv(DATA_FILE)

df["datetime"] = pd.to_datetime(df["datetime"])

# Identical sort order to model_evaluation_fixed.py
df = df.sort_values(
    ["station", "datetime"]
).reset_index(drop=True)

print("\nDataset shape:")
print(df.shape)

print("\nDate range:")
print(df["datetime"].min())
print(df["datetime"].max())

print("\nNumber of stations:")
if "station" in df.columns:
    print(df["station"].nunique())

# ============================================================
# FEATURES
# Identical list to model_evaluation_fixed.py — do not change
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
    "major_flood_level",
]

target = "target_water_level"

# Keep only features present in the dataset
features = [f for f in features if f in df.columns]

print("\nFeatures used:")
for f in features:
    print(" -", f)

print(f"\nTotal features: {len(features)}")

# ============================================================
# MODEL DATA — identical to model_evaluation_fixed.py
# ============================================================

model_df = df[features + [target, "datetime"]].copy()

model_df = model_df.dropna()

print("\nRows after removing missing values:")
print(len(model_df))

# ============================================================
# TIME-BASED SPLIT
# Cut-off identical to model_evaluation_fixed.py
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

print("\nTraining data:", train.shape)
print("Testing data: ", test.shape)

print("\nTraining period:",
      train["datetime"].min(),
      "to",
      train["datetime"].max())

print("\nTesting period:",
      test["datetime"].min(),
      "to",
      test["datetime"].max())

X_train = train[features]
y_train = train[target]

X_test = test[features]
y_test = test[target]

# ============================================================
# Containers for results
# ============================================================

results_list = []

pred_df = test[["datetime"]].copy()
pred_df["actual_water_level"] = y_test.values

# ============================================================
# MODEL 1 — RANDOM FOREST
# Hyperparameters identical to model_evaluation_fixed.py
# ============================================================

print("\n" + "=" * 70)
print("MODEL 1 — RANDOM FOREST")
print("=" * 70)

rf = RandomForestRegressor(
    n_estimators=200,
    max_depth=20,
    random_state=42,
    n_jobs=-1,
)

print("\nTraining Random Forest...")
rf.fit(X_train, y_train)

print("Making predictions...")
rf_pred = rf.predict(X_test)

rf_mae  = mean_absolute_error(y_test, rf_pred)
rf_rmse = np.sqrt(mean_squared_error(y_test, rf_pred))
rf_r2   = r2_score(y_test, rf_pred)
rf_max  = float(np.max(np.abs(y_test.values - rf_pred)))

print("\nRandom Forest Results:")
print(f"  MAE       : {rf_mae}")
print(f"  RMSE      : {rf_rmse}")
print(f"  R2        : {rf_r2}")
print(f"  Max Error : {rf_max}")

# ============================================================
# BASELINE VERIFICATION — RANDOM FOREST
# If results differ by more than TOLERANCE, print a warning.
# This does NOT halt execution but must be investigated.
# ============================================================

print("\n" + "=" * 70)
print("BASELINE VERIFICATION — RANDOM FOREST")
print("=" * 70)

rf_mae_match  = abs(rf_mae  - BASELINE_RF_MAE)  < TOLERANCE
rf_rmse_match = abs(rf_rmse - BASELINE_RF_RMSE) < TOLERANCE
rf_r2_match   = abs(rf_r2   - BASELINE_RF_R2)   < TOLERANCE

print(f"\n  Expected MAE  : {BASELINE_RF_MAE}")
print(f"  Computed MAE  : {rf_mae}")
print(f"  Difference    : {abs(rf_mae - BASELINE_RF_MAE):.2e}")
print(f"  Match         : {'YES' if rf_mae_match else 'NO — INVESTIGATE'}")

print(f"\n  Expected RMSE : {BASELINE_RF_RMSE}")
print(f"  Computed RMSE : {rf_rmse}")
print(f"  Difference    : {abs(rf_rmse - BASELINE_RF_RMSE):.2e}")
print(f"  Match         : {'YES' if rf_rmse_match else 'NO — INVESTIGATE'}")

print(f"\n  Expected R2   : {BASELINE_RF_R2}")
print(f"  Computed R2   : {rf_r2}")
print(f"  Difference    : {abs(rf_r2 - BASELINE_RF_R2):.2e}")
print(f"  Match         : {'YES' if rf_r2_match else 'NO — INVESTIGATE'}")

if not (rf_mae_match and rf_rmse_match and rf_r2_match):
    print(
        "\nWARNING: Random Forest results differ from baseline."
        "\nThis may indicate that the dataset (ml_features_fixed.csv) has"
        "\nbeen updated since the baseline was last recorded."
        "\nIf the dataset has not changed, investigate before proceeding."
    )
else:
    print("\nBaseline CONFIRMED — Random Forest results match exactly.")

pred_df["random_forest_prediction"] = rf_pred

results_list.append({
    "Model":     "Random Forest",
    "MAE":       rf_mae,
    "RMSE":      rf_rmse,
    "R2":        rf_r2,
    "Max_Error": rf_max,
})

# ============================================================
# MODEL 2 — XGBOOST
# Hyperparameters identical to model_evaluation_fixed.py
# ============================================================

print("\n" + "=" * 70)
print("MODEL 2 — XGBOOST")
print("=" * 70)

xgb = XGBRegressor(
    n_estimators=300,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    objective="reg:squarederror",
    random_state=42,
    n_jobs=-1,
)

print("\nTraining XGBoost...")
xgb.fit(X_train, y_train)

print("Making predictions...")
xgb_pred = xgb.predict(X_test)

xgb_mae  = mean_absolute_error(y_test, xgb_pred)
xgb_rmse = np.sqrt(mean_squared_error(y_test, xgb_pred))
xgb_r2   = r2_score(y_test, xgb_pred)
xgb_max  = float(np.max(np.abs(y_test.values - xgb_pred)))

print("\nXGBoost Results:")
print(f"  MAE       : {xgb_mae}")
print(f"  RMSE      : {xgb_rmse}")
print(f"  R2        : {xgb_r2}")
print(f"  Max Error : {xgb_max}")

# ============================================================
# BASELINE VERIFICATION — XGBOOST
# ============================================================

print("\n" + "=" * 70)
print("BASELINE VERIFICATION — XGBOOST")
print("=" * 70)

xgb_mae_match  = abs(xgb_mae  - BASELINE_XGB_MAE)  < TOLERANCE
xgb_rmse_match = abs(xgb_rmse - BASELINE_XGB_RMSE) < TOLERANCE
xgb_r2_match   = abs(xgb_r2   - BASELINE_XGB_R2)   < TOLERANCE

print(f"\n  Expected MAE  : {BASELINE_XGB_MAE}")
print(f"  Computed MAE  : {xgb_mae}")
print(f"  Difference    : {abs(xgb_mae - BASELINE_XGB_MAE):.2e}")
print(f"  Match         : {'YES' if xgb_mae_match else 'NO — INVESTIGATE'}")

print(f"\n  Expected RMSE : {BASELINE_XGB_RMSE}")
print(f"  Computed RMSE : {xgb_rmse}")
print(f"  Difference    : {abs(xgb_rmse - BASELINE_XGB_RMSE):.2e}")
print(f"  Match         : {'YES' if xgb_rmse_match else 'NO — INVESTIGATE'}")

print(f"\n  Expected R2   : {BASELINE_XGB_R2}")
print(f"  Computed R2   : {xgb_r2}")
print(f"  Difference    : {abs(xgb_r2 - BASELINE_XGB_R2):.2e}")
print(f"  Match         : {'YES' if xgb_r2_match else 'NO — INVESTIGATE'}")

if not (xgb_mae_match and xgb_rmse_match and xgb_r2_match):
    print(
        "\nWARNING: XGBoost results differ from baseline."
        "\nThis may indicate that the dataset has changed or that"
        "\nthe XGBoost version differs from the original training run."
        "\nIf the dataset has not changed, investigate before proceeding."
    )
else:
    print("\nBaseline CONFIRMED — XGBoost results match exactly.")

pred_df["xgboost_prediction"] = xgb_pred

results_list.append({
    "Model":     "XGBoost",
    "MAE":       xgb_mae,
    "RMSE":      xgb_rmse,
    "R2":        xgb_r2,
    "Max_Error": xgb_max,
})

# ============================================================
# MODEL 3 — GRADIENT BOOSTING REGRESSOR
# NOTE: GradientBoostingRegressor is sequential (no n_jobs).
# Training is slower than RF/XGB. Expect several minutes.
# ============================================================

print("\n" + "=" * 70)
print("MODEL 3 — GRADIENT BOOSTING REGRESSOR (sklearn)")
print("NOTE: Sequential algorithm — training may take several minutes.")
print("=" * 70)

gbr = GradientBoostingRegressor(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    random_state=42,
    verbose=1,
)

print("\nTraining Gradient Boosting Regressor...")
gbr.fit(X_train, y_train)

print("\nMaking predictions...")
gbr_pred = gbr.predict(X_test)

gbr_mae  = mean_absolute_error(y_test, gbr_pred)
gbr_rmse = np.sqrt(mean_squared_error(y_test, gbr_pred))
gbr_r2   = r2_score(y_test, gbr_pred)
gbr_max  = float(np.max(np.abs(y_test.values - gbr_pred)))

print("\nGradient Boosting Results:")
print(f"  MAE       : {round(gbr_mae, 6)}")
print(f"  RMSE      : {round(gbr_rmse, 6)}")
print(f"  R2        : {round(gbr_r2, 6)}")
print(f"  Max Error : {round(gbr_max, 6)}")

pred_df["gradient_boosting_prediction"] = gbr_pred

results_list.append({
    "Model":     "Gradient Boosting",
    "MAE":       gbr_mae,
    "RMSE":      gbr_rmse,
    "R2":        gbr_r2,
    "Max_Error": gbr_max,
})

# ============================================================
# MODEL 4 — EXTRA TREES REGRESSOR
# Same n_estimators and max_depth as RF for a fair comparison
# within the bagging family.
# ============================================================

print("\n" + "=" * 70)
print("MODEL 4 — EXTRA TREES REGRESSOR")
print("=" * 70)

et = ExtraTreesRegressor(
    n_estimators=200,
    max_depth=20,
    random_state=42,
    n_jobs=-1,
)

print("\nTraining Extra Trees Regressor...")
et.fit(X_train, y_train)

print("Making predictions...")
et_pred = et.predict(X_test)

et_mae  = mean_absolute_error(y_test, et_pred)
et_rmse = np.sqrt(mean_squared_error(y_test, et_pred))
et_r2   = r2_score(y_test, et_pred)
et_max  = float(np.max(np.abs(y_test.values - et_pred)))

print("\nExtra Trees Results:")
print(f"  MAE       : {round(et_mae, 6)}")
print(f"  RMSE      : {round(et_rmse, 6)}")
print(f"  R2        : {round(et_r2, 6)}")
print(f"  Max Error : {round(et_max, 6)}")

pred_df["extra_trees_prediction"] = et_pred

results_list.append({
    "Model":     "Extra Trees",
    "MAE":       et_mae,
    "RMSE":      et_rmse,
    "R2":        et_r2,
    "Max_Error": et_max,
})

# ============================================================
# MODEL COMPARISON — ALL FOUR INDIVIDUAL MODELS
# ============================================================

results_df = pd.DataFrame(results_list)

print("\n" + "=" * 70)
print("MODEL COMPARISON — ALL INDIVIDUAL MODELS")
print("=" * 70)
print(results_df.to_string(index=False))

best_row = results_df.loc[results_df["RMSE"].idxmin()]
print(f"\nBest individual model (lowest RMSE): {best_row['Model']}")

# ============================================================
# SAVE RESULTS — NEW FILES ONLY
# Baseline files (model_results_fixed.csv, etc.) are untouched.
# ============================================================

results_df.to_csv(RESULT_FILE, index=False)
print(f"\nSaved: {RESULT_FILE}")

pred_df.to_csv(PREDICTION_FILE, index=False)
print(f"Saved: {PREDICTION_FILE}")

# ============================================================
# SAVE NEW MODEL PKL FILES
# Does NOT overwrite random_forest_fixed.pkl or xgboost_fixed.pkl
# ============================================================

gbr_file = MODEL_DIR / "gradient_boosting_fixed.pkl"
et_file  = MODEL_DIR / "extra_trees_fixed.pkl"

joblib.dump(gbr, gbr_file)
print(f"Saved: {gbr_file}")

joblib.dump(et, et_file)
print(f"Saved: {et_file}")

# ============================================================
# FEATURE IMPORTANCE (RF, GBR, ExtraTrees all have this attribute)
# XGBoost uses a different importance mechanism so is omitted here.
# ============================================================

importance_df = pd.DataFrame({
    "feature":        features,
    "rf_importance":  rf.feature_importances_,
    "gbr_importance": gbr.feature_importances_,
    "et_importance":  et.feature_importances_,
})

importance_df = importance_df.sort_values(
    "rf_importance",
    ascending=False,
)

importance_df.to_csv(IMPORTANCE_FILE, index=False)
print(f"Saved: {IMPORTANCE_FILE}")

print("\n" + "=" * 70)
print("TOP 10 FEATURES (sorted by Random Forest importance)")
print("=" * 70)
print(importance_df.head(10).to_string(index=False))

# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 70)
print("STEP 13 EXTENDED COMPLETE")
print("=" * 70)

print("\nExisting baseline files — NOT MODIFIED:")
print("  outputs/ml/model_results_fixed.csv")
print("  outputs/ml/model_predictions_fixed.csv")
print("  outputs/ml/feature_importance_fixed.csv")
print("  outputs/ml/final_model_summary.csv")
print("  outputs/ml/models/random_forest_fixed.pkl")
print("  outputs/ml/models/xgboost_fixed.pkl")

print("\nNew files created:")
print(f"  {RESULT_FILE}")
print(f"  {PREDICTION_FILE}")
print(f"  {IMPORTANCE_FILE}")
print(f"  {gbr_file}")
print(f"  {et_file}")

print("\nNext step: run scripts/hybrid_model.py (Step 15)")
