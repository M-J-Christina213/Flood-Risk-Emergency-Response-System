from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

print("=" * 70)
print("STEP 14 - FINAL MODEL EVALUATION")
print("=" * 70)

# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

ML_DIR = ROOT / "outputs" / "ml"
MODEL_DIR = ML_DIR / "models"
PLOT_DIR = ML_DIR / "plots"

PLOT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

RESULT_FILE = ML_DIR / "model_results_fixed.csv"
PREDICTION_FILE = ML_DIR / "model_predictions_fixed.csv"
IMPORTANCE_FILE = ML_DIR / "feature_importance_fixed.csv"

# ============================================================
# LOAD RESULTS
# ============================================================

results = pd.read_csv(RESULT_FILE)

predictions = pd.read_csv(PREDICTION_FILE)

predictions["datetime"] = pd.to_datetime(
    predictions["datetime"]
)

importance = pd.read_csv(
    IMPORTANCE_FILE
)

print("\n" + "=" * 70)
print("MODEL RESULTS")
print("=" * 70)

print(
    results.to_string(
        index=False
    )
)

# ============================================================
# FIND BEST MODEL
# ============================================================

best_by_rmse = results.loc[
    results["RMSE"].idxmin()
]

best_by_mae = results.loc[
    results["MAE"].idxmin()
]

best_by_r2 = results.loc[
    results["R2"].idxmax()
]

print("\n" + "=" * 70)
print("BEST MODELS")
print("=" * 70)

print(
    "\nBest by MAE:",
    best_by_mae["Model"],
    "-",
    round(best_by_mae["MAE"], 4)
)

print(
    "Best by RMSE:",
    best_by_rmse["Model"],
    "-",
    round(best_by_rmse["RMSE"], 4)
)

print(
    "Best by R²:",
    best_by_r2["Model"],
    "-",
    round(best_by_r2["R2"], 4)
)

# ============================================================
# SELECT FINAL MODEL
# ============================================================

final_model_name = best_by_rmse["Model"]

print("\n" + "=" * 70)
print("FINAL MODEL SELECTION")
print("=" * 70)

print("\nSelected model:")
print(final_model_name)

print("\nSelection criterion:")
print("Lowest RMSE")

# ============================================================
# ACTUAL VS PREDICTED - RANDOM FOREST
# ============================================================

actual = predictions[
    "actual_water_level"
]

rf_pred = predictions[
    "random_forest_prediction"
]

xgb_pred = predictions[
    "xgboost_prediction"
]

plt.figure(
    figsize=(12, 6)
)

plt.plot(
    actual.values,
    label="Actual"
)

plt.plot(
    rf_pred.values,
    label="Random Forest Prediction"
)

plt.title(
    "Actual vs Random Forest Predicted Water Level"
)

plt.xlabel(
    "Test Observation"
)

plt.ylabel(
    "Water Level"
)

plt.legend()

plt.tight_layout()

rf_actual_plot = (
    PLOT_DIR /
    "final_random_forest_actual_vs_predicted.png"
)

plt.savefig(
    rf_actual_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(rf_actual_plot)

# ============================================================
# ACTUAL VS PREDICTED - XGBOOST
# ============================================================

plt.figure(
    figsize=(12, 6)
)

plt.plot(
    actual.values,
    label="Actual"
)

plt.plot(
    xgb_pred.values,
    label="XGBoost Prediction"
)

plt.title(
    "Actual vs XGBoost Predicted Water Level"
)

plt.xlabel(
    "Test Observation"
)

plt.ylabel(
    "Water Level"
)

plt.legend()

plt.tight_layout()

xgb_actual_plot = (
    PLOT_DIR /
    "final_xgboost_actual_vs_predicted.png"
)

plt.savefig(
    xgb_actual_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(xgb_actual_plot)

# ============================================================
# RANDOM FOREST ERROR DISTRIBUTION
# ============================================================

rf_error = (
    actual - rf_pred
)

plt.figure(
    figsize=(10, 6)
)

plt.hist(
    rf_error,
    bins=40
)

plt.title(
    "Random Forest Prediction Error Distribution"
)

plt.xlabel(
    "Prediction Error"
)

plt.ylabel(
    "Frequency"
)

plt.tight_layout()

error_plot = (
    PLOT_DIR /
    "final_random_forest_error_distribution.png"
)

plt.savefig(
    error_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(error_plot)

# ============================================================
# RANDOM FOREST SCATTER
# ============================================================

plt.figure(
    figsize=(8, 8)
)

plt.scatter(
    actual,
    rf_pred,
    alpha=0.4
)

minimum = min(
    actual.min(),
    rf_pred.min()
)

maximum = max(
    actual.max(),
    rf_pred.max()
)

plt.plot(
    [minimum, maximum],
    [minimum, maximum],
    linestyle="--"
)

plt.title(
    "Random Forest: Actual vs Predicted"
)

plt.xlabel(
    "Actual Water Level"
)

plt.ylabel(
    "Predicted Water Level"
)

plt.tight_layout()

scatter_plot = (
    PLOT_DIR /
    "final_random_forest_scatter.png"
)

plt.savefig(
    scatter_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(scatter_plot)

# ============================================================
# FEATURE IMPORTANCE
# ============================================================

top_features = importance.head(15)

plt.figure(
    figsize=(10, 7)
)

plt.barh(
    top_features["feature"][::-1],
    top_features["importance"][::-1]
)

plt.title(
    "Random Forest Feature Importance"
)

plt.xlabel(
    "Importance"
)

plt.ylabel(
    "Feature"
)

plt.tight_layout()

importance_plot = (
    PLOT_DIR /
    "final_feature_importance.png"
)

plt.savefig(
    importance_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(importance_plot)

# ============================================================
# SAVE FINAL SUMMARY
# ============================================================

summary = pd.DataFrame({
    "selected_model": [
        final_model_name
    ],

    "selection_metric": [
        "RMSE"
    ],

    "random_forest_mae": [
        results.loc[
            results["Model"] == "Random Forest",
            "MAE"
        ].iloc[0]
    ],

    "random_forest_rmse": [
        results.loc[
            results["Model"] == "Random Forest",
            "RMSE"
        ].iloc[0]
    ],

    "random_forest_r2": [
        results.loc[
            results["Model"] == "Random Forest",
            "R2"
        ].iloc[0]
    ],

    "xgboost_mae": [
        results.loc[
            results["Model"] == "XGBoost",
            "MAE"
        ].iloc[0]
    ],

    "xgboost_rmse": [
        results.loc[
            results["Model"] == "XGBoost",
            "RMSE"
        ].iloc[0]
    ],

    "xgboost_r2": [
        results.loc[
            results["Model"] == "XGBoost",
            "R2"
        ].iloc[0]
    ]
})

summary_file = (
    ML_DIR /
    "final_model_summary.csv"
)

summary.to_csv(
    summary_file,
    index=False
)

print("\nSaved:")
print(summary_file)

# ============================================================
# COPY SELECTED MODEL TO CLEAR NAME
# ============================================================

if final_model_name == "Random Forest":

    source_model = (
        MODEL_DIR /
        "random_forest_fixed.pkl"
    )

else:

    source_model = (
        MODEL_DIR /
        "xgboost_fixed.pkl"
    )

final_model_file = (
    MODEL_DIR /
    "flood_prediction_model.pkl"
)

import shutil

shutil.copy2(
    source_model,
    final_model_file
)

print("\nFinal application model:")
print(final_model_file)

# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 70)
print("STEP 14 COMPLETE")
print("=" * 70)

print("\nSelected model:")
print(final_model_name)

print("\nOutput directory:")
print(ML_DIR)

print("\nFinal files:")
print(" - final_model_summary.csv")
print(" - models/flood_prediction_model.pkl")
print(" - plots/final_random_forest_actual_vs_predicted.png")
print(" - plots/final_xgboost_actual_vs_predicted.png")
print(" - plots/final_random_forest_error_distribution.png")
print(" - plots/final_random_forest_scatter.png")
print(" - plots/final_feature_importance.png")