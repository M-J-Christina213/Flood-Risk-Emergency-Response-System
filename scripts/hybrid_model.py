from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
)
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

print("=" * 70)
print("STEP 15 - RF + GRADIENT BOOSTING WEIGHTED HYBRID MODEL")
print("=" * 70)
print()
print("Hybrid Prediction = w_RF x RF_Prediction + w_GB x GB_Prediction")
print()
print("Weight derivation strategy:")
print("  1. Carve a VALIDATION SET from the training data (year 2024).")
print("  2. Train RF and GBR on the SUB-TRAIN set (before 2024).")
print("  3. Derive weights from validation-set RMSE only.")
print("  4. The TEST SET is NEVER used to select or adjust weights.")
print("  5. Apply fixed weights to the full-train model predictions on test set.")

# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

DATA_FILE = ROOT / "outputs" / "ml_features_fixed.csv"

OUTPUT_DIR = ROOT / "outputs" / "ml"
MODEL_DIR  = OUTPUT_DIR / "models"

RESULT_FILE     = OUTPUT_DIR / "model_results_extended.csv"
PREDICTION_FILE = OUTPUT_DIR / "model_predictions_extended.csv"
WEIGHTS_FILE    = OUTPUT_DIR / "hybrid_weights.csv"

# ============================================================
# CHECK PREREQUISITES
# model_evaluation_extended.py must have been run first.
# ============================================================

print("\nChecking prerequisites...")

for f in [RESULT_FILE, PREDICTION_FILE]:
    if not f.exists():
        raise FileNotFoundError(
            f"\nRequired file not found: {f}"
            "\nPlease run model_evaluation_extended.py (Step 13 Extended) first."
        )

# Verify required prediction columns exist
pred_check = pd.read_csv(PREDICTION_FILE, nrows=2)

required_columns = [
    "datetime",
    "actual_water_level",
    "random_forest_prediction",
    "gradient_boosting_prediction",
]

missing = [c for c in required_columns if c not in pred_check.columns]
if missing:
    raise ValueError(
        f"\nMissing columns in {PREDICTION_FILE}: {missing}"
        "\nPlease re-run model_evaluation_extended.py to regenerate this file."
    )

print("Prerequisites satisfied.")

# ============================================================
# LOAD DATA — identical to all other scripts
# ============================================================

print("\nLoading:")
print(DATA_FILE)

df = pd.read_csv(DATA_FILE)
df["datetime"] = pd.to_datetime(df["datetime"])

# Identical sort order to model_evaluation_fixed.py
df = df.sort_values(["station", "datetime"]).reset_index(drop=True)

# ============================================================
# FEATURES — identical list, identical filter
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

features = [f for f in features if f in df.columns]

# ============================================================
# PREPARE DATA
# ============================================================

model_df = df[features + [target, "datetime"]].copy()
model_df = model_df.dropna()

# ============================================================
# THREE SPLITS
#
# Full train / test  — same as model_evaluation_extended.py
# Sub-train / validation — for weight derivation ONLY
#   Sub-train : datetime < 2024-01-01
#   Validation: 2024-01-01 <= datetime < 2025-01-01
#   (Sub-train + validation = full train)
# ============================================================

print("\n" + "=" * 70)
print("DATA SPLITS")
print("=" * 70)

train_full = model_df[model_df["datetime"] < "2025-01-01"].copy()
test       = model_df[model_df["datetime"] >= "2025-01-01"].copy()

sub_train  = model_df[model_df["datetime"] < "2024-01-01"].copy()
validation = model_df[
    (model_df["datetime"] >= "2024-01-01") &
    (model_df["datetime"] <  "2025-01-01")
].copy()

print(f"\nFull training set   : {len(train_full):>6} rows  (used for final model deployment)")
print(f"Test set            : {len(test):>6} rows  (used ONLY for final evaluation)")
print()
print(f"Sub-training set    : {len(sub_train):>6} rows  (datetime < 2024-01-01)")
print(f"Validation set      : {len(validation):>6} rows  (year 2024 only)")
print("(Sub-train + validation = full training set)")

X_sub  = sub_train[features]
y_sub  = sub_train[target]

X_val  = validation[features]
y_val  = validation[target]

X_test = test[features]
y_test = test[target]

# ============================================================
# STEP 1 — TRAIN TEMPORARY MODELS ON SUB-TRAIN
# These models are used ONLY to determine weights from the
# validation set. They are NOT used for test-set prediction.
# ============================================================

print("\n" + "=" * 70)
print("STEP 1 — WEIGHT DERIVATION")
print("Training temporary models on sub-train set.")
print("The test set is NOT touched in this step.")
print("=" * 70)

print("\nTraining temporary RF on sub-train...")
rf_sub = RandomForestRegressor(
    n_estimators=200,
    max_depth=20,
    random_state=42,
    n_jobs=-1,
)
rf_sub.fit(X_sub, y_sub)

print("Training temporary GBR on sub-train...")
gbr_sub = GradientBoostingRegressor(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    random_state=42,
    verbose=1,
)
gbr_sub.fit(X_sub, y_sub)

# Predict on validation set
rf_val_pred  = rf_sub.predict(X_val)
gbr_val_pred = gbr_sub.predict(X_val)

rf_val_rmse  = float(np.sqrt(mean_squared_error(y_val, rf_val_pred)))
gbr_val_rmse = float(np.sqrt(mean_squared_error(y_val, gbr_val_pred)))

rf_val_mae  = float(mean_absolute_error(y_val, rf_val_pred))
gbr_val_mae = float(mean_absolute_error(y_val, gbr_val_pred))

print("\n" + "=" * 70)
print("VALIDATION SET PERFORMANCE (sub-train models)")
print("=" * 70)

print(f"\n  RF  — MAE: {round(rf_val_mae, 4)}   RMSE: {round(rf_val_rmse, 4)}")
print(f"  GBR — MAE: {round(gbr_val_mae, 4)}   RMSE: {round(gbr_val_rmse, 4)}")

# ============================================================
# INVERSE-RMSE WEIGHTS
#
# w_RF  = (1/RMSE_RF)  / (1/RMSE_RF + 1/RMSE_GBR)
# w_GBR = (1/RMSE_GBR) / (1/RMSE_RF + 1/RMSE_GBR)
#
# A model with lower validation RMSE receives a higher weight.
# Weights sum to exactly 1.0.
# ============================================================

inv_rf  = 1.0 / rf_val_rmse
inv_gbr = 1.0 / gbr_val_rmse
total   = inv_rf + inv_gbr

w_rf  = inv_rf  / total
w_gbr = inv_gbr / total

print("\n" + "=" * 70)
print("DERIVED HYBRID WEIGHTS (inverse-RMSE, leak-free)")
print("=" * 70)

print(f"\n  w_RF  = 1/{round(rf_val_rmse,  4)} / (1/{round(rf_val_rmse, 4)} + 1/{round(gbr_val_rmse, 4)})")
print(f"        = {round(w_rf, 6)}")
print(f"\n  w_GBR = 1/{round(gbr_val_rmse, 4)} / (1/{round(rf_val_rmse, 4)} + 1/{round(gbr_val_rmse, 4)})")
print(f"        = {round(w_gbr, 6)}")
print(f"\n  Sum   = {round(w_rf + w_gbr, 8)}  (must equal 1.0)")

if abs(w_rf + w_gbr - 1.0) > 1e-10:
    raise ArithmeticError(
        f"Weights do not sum to 1.0: {w_rf + w_gbr}"
    )

# ============================================================
# STEP 2 — APPLY WEIGHTS TO FULL-TRAIN TEST PREDICTIONS
#
# The full-train RF and GBR were already trained by
# model_evaluation_extended.py and their test predictions
# are stored in model_predictions_extended.csv.
# We load those predictions here to avoid retraining.
# ============================================================

print("\n" + "=" * 70)
print("STEP 2 — COMPUTE HYBRID PREDICTIONS ON TEST SET")
print("Loading full-train predictions from model_predictions_extended.csv")
print("(No retraining needed — weights are applied to existing predictions.)")
print("=" * 70)

pred_df = pd.read_csv(PREDICTION_FILE)

rf_test_pred  = pred_df["random_forest_prediction"].values
gbr_test_pred = pred_df["gradient_boosting_prediction"].values
actual        = pred_df["actual_water_level"].values

hybrid_pred = w_rf * rf_test_pred + w_gbr * gbr_test_pred

pred_df["hybrid_rf_gb_prediction"] = hybrid_pred

# ============================================================
# EVALUATE HYBRID ON TEST SET
# This is the first (and only) time the test set is used
# for the hybrid — with weights already fixed from validation.
# ============================================================

hybrid_mae  = float(mean_absolute_error(actual, hybrid_pred))
hybrid_rmse = float(np.sqrt(mean_squared_error(actual, hybrid_pred)))
hybrid_r2   = float(r2_score(actual, hybrid_pred))
hybrid_max  = float(np.max(np.abs(actual - hybrid_pred)))

print("\n" + "=" * 70)
print("HYBRID MODEL — TEST SET RESULTS")
print(f"Formula: {round(w_rf, 4)} x RF + {round(w_gbr, 4)} x GBR")
print("=" * 70)

print(f"\n  MAE       : {round(hybrid_mae, 6)}")
print(f"  RMSE      : {round(hybrid_rmse, 6)}")
print(f"  R2        : {round(hybrid_r2, 6)}")
print(f"  Max Error : {round(hybrid_max, 6)}")

# ============================================================
# COMPARE HYBRID AGAINST INDIVIDUAL MODELS
# ============================================================

results_df = pd.read_csv(RESULT_FILE)

hybrid_row = pd.DataFrame([{
    "Model":     "RF + GB Hybrid",
    "MAE":       hybrid_mae,
    "RMSE":      hybrid_rmse,
    "R2":        hybrid_r2,
    "Max_Error": hybrid_max,
}])

results_df = pd.concat(
    [results_df, hybrid_row],
    ignore_index=True,
)

print("\n" + "=" * 70)
print("FULL MODEL COMPARISON (all 5 models)")
print("=" * 70)
print(results_df.to_string(index=False))

best_row = results_df.loc[results_df["RMSE"].idxmin()]
print(f"\nBest model (lowest RMSE): {best_row['Model']} — {round(best_row['RMSE'], 4)}")

# ============================================================
# SAVE UPDATED RESULTS
# Appends hybrid row to model_results_extended.csv.
# Does NOT touch model_results_fixed.csv.
# ============================================================

results_df.to_csv(RESULT_FILE, index=False)
print(f"\nUpdated: {RESULT_FILE}  (now contains 5 models including hybrid)")

pred_df.to_csv(PREDICTION_FILE, index=False)
print(f"Updated: {PREDICTION_FILE}  (now contains hybrid_rf_gb_prediction column)")

# ============================================================
# SAVE HYBRID WEIGHTS FOR TRANSPARENCY
# ============================================================

weights_df = pd.DataFrame([{
    "w_random_forest":        round(w_rf, 8),
    "w_gradient_boosting":    round(w_gbr, 8),
    "rf_val_rmse":            round(rf_val_rmse, 8),
    "gbr_val_rmse":           round(gbr_val_rmse, 8),
    "validation_period_start": "2024-01-01",
    "validation_period_end":   "2024-12-31",
    "weight_derivation_method": "inverse_RMSE",
    "test_set_used_for_weights": False,
}])

weights_df.to_csv(WEIGHTS_FILE, index=False)
print(f"Saved: {WEIGHTS_FILE}")

# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 70)
print("STEP 15 COMPLETE")
print("=" * 70)

print(f"\nHybrid formula: {round(w_rf, 4)} x RF + {round(w_gbr, 4)} x GBR")
print("\nWeights derived from: year 2024 validation set only")
print("Test set (2025+) was NOT used to derive or adjust weights.")

print("\nUpdated files:")
print(f"  {RESULT_FILE.name}    (5 model rows including hybrid)")
print(f"  {PREDICTION_FILE.name}  (hybrid_rf_gb_prediction column added)")
print(f"  {WEIGHTS_FILE.name}")

print("\nExisting baseline files — NOT MODIFIED:")
print("  outputs/ml/model_results_fixed.csv")
print("  outputs/ml/final_model_summary.csv")

print("\nNext step: run scripts/final_model_evaluation_extended.py (Step 14 Extended)")
