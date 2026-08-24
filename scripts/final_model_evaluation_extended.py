from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import shutil

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

print("=" * 70)
print("STEP 14 EXTENDED - COMPREHENSIVE MODEL EVALUATION")
print("All 5 models: RF | XGB | GBR | Extra Trees | RF+GB Hybrid")
print("=" * 70)
print()
print("This script reads extended output files only.")
print("Existing baseline files (model_results_fixed.csv, etc.) are NOT modified.")

# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

OUTPUT_DIR = ROOT / "outputs" / "ml"
MODEL_DIR  = OUTPUT_DIR / "models"
PLOT_DIR   = OUTPUT_DIR / "plots"
PLOT_DIR.mkdir(parents=True, exist_ok=True)

RESULT_FILE     = OUTPUT_DIR / "model_results_extended.csv"
PREDICTION_FILE = OUTPUT_DIR / "model_predictions_extended.csv"
IMPORTANCE_FILE = OUTPUT_DIR / "feature_importance_extended.csv"
WEIGHTS_FILE    = OUTPUT_DIR / "hybrid_weights.csv"

# New summary file — does NOT overwrite final_model_summary.csv
SUMMARY_FILE = OUTPUT_DIR / "final_model_summary_extended.csv"

# ============================================================
# CHECK PREREQUISITES
# ============================================================

print("\nChecking prerequisites...")

for f in [RESULT_FILE, PREDICTION_FILE]:
    if not f.exists():
        raise FileNotFoundError(
            f"\nRequired file not found: {f}"
            "\nPlease run:"
            "\n  1. model_evaluation_extended.py  (Step 13 Extended)"
            "\n  2. hybrid_model.py               (Step 15)"
        )

print("Prerequisites satisfied.")

# ============================================================
# LOAD DATA
# ============================================================

results     = pd.read_csv(RESULT_FILE)
predictions = pd.read_csv(PREDICTION_FILE)

predictions["datetime"] = pd.to_datetime(predictions["datetime"])

print("\n" + "=" * 70)
print("MODEL RESULTS — ALL MODELS")
print("=" * 70)
print(results.to_string(index=False))

# ============================================================
# MAP MODEL NAMES TO PREDICTION COLUMNS
# Only include models whose prediction column exists in the file.
# This allows the script to run even if hybrid_model.py hasn't
# been run yet (it will simply skip the hybrid plots).
# ============================================================

MODEL_COLUMN_MAP = {
    "Random Forest":     "random_forest_prediction",
    "XGBoost":           "xgboost_prediction",
    "Gradient Boosting": "gradient_boosting_prediction",
    "Extra Trees":       "extra_trees_prediction",
    "RF + GB Hybrid":    "hybrid_rf_gb_prediction",
}

# Filter to only models with a prediction column present
active_models = {
    name: col
    for name, col in MODEL_COLUMN_MAP.items()
    if col in predictions.columns
}

print(f"\nModels with prediction data: {list(active_models.keys())}")

actual = predictions["actual_water_level"]

# ============================================================
# FIND BEST MODEL
# ============================================================

best_by_rmse = results.loc[results["RMSE"].idxmin()]
best_by_mae  = results.loc[results["MAE"].idxmin()]
best_by_r2   = results.loc[results["R2"].idxmax()]

print("\n" + "=" * 70)
print("BEST MODELS")
print("=" * 70)

print(f"\n  Best by MAE : {best_by_mae['Model']}  — {round(best_by_mae['MAE'], 4)}")
print(f"  Best by RMSE: {best_by_rmse['Model']} — {round(best_by_rmse['RMSE'], 4)}")
print(f"  Best by R2  : {best_by_r2['Model']}  — {round(best_by_r2['R2'], 4)}")

# Primary selection criterion: lowest RMSE
final_model_name = best_by_rmse["Model"]

print(f"\n  Selected model (primary criterion — lowest RMSE): {final_model_name}")

# ============================================================
# HELPER — safe filename prefix for each model
# ============================================================

def safe_prefix(model_name: str) -> str:
    return (
        model_name
        .lower()
        .replace(" ", "_")
        .replace("+", "plus")
        .replace("/", "_")
    )

# ============================================================
# PLOT 1 — ACTUAL VS PREDICTED LINE PLOTS (per model)
# Show first N_PLOT observations for clarity.
# ============================================================

N_PLOT = min(500, len(predictions))

print("\n" + "=" * 70)
print("GENERATING ACTUAL vs PREDICTED LINE PLOTS")
print("=" * 70)

for model_name, col in active_models.items():

    pred_vals = predictions[col].values

    fig, ax = plt.subplots(figsize=(13, 5))

    ax.plot(
        range(N_PLOT),
        actual.values[:N_PLOT],
        label="Actual",
        linewidth=1.0,
        color="#2c7bb6",
        zorder=3,
    )

    ax.plot(
        range(N_PLOT),
        pred_vals[:N_PLOT],
        label=f"{model_name} Prediction",
        linewidth=0.85,
        alpha=0.85,
        color="#d7191c",
        zorder=2,
    )

    ax.set_title(
        f"Actual vs {model_name} Predicted Water Level\n"
        f"(First {N_PLOT} test observations, 2025 onward)"
    )
    ax.set_xlabel("Test Observation Index")
    ax.set_ylabel("Water Level (m)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()

    plot_path = PLOT_DIR / f"ext_{safe_prefix(model_name)}_actual_vs_predicted.png"
    plt.savefig(plot_path, dpi=300)
    plt.close()
    print(f"  Saved: {plot_path.name}")

# ============================================================
# PLOT 2 — SCATTER PLOTS (actual vs predicted, per model)
# ============================================================

print("\n" + "=" * 70)
print("GENERATING SCATTER PLOTS")
print("=" * 70)

for model_name, col in active_models.items():

    pred_vals = predictions[col].values

    fig, ax = plt.subplots(figsize=(7, 7))

    ax.scatter(actual, pred_vals, alpha=0.25, s=6, color="#4393c3", rasterized=True)

    lim_min = min(float(actual.min()), float(pred_vals.min()))
    lim_max = max(float(actual.max()), float(pred_vals.max()))
    ax.plot(
        [lim_min, lim_max],
        [lim_min, lim_max],
        linestyle="--",
        color="red",
        linewidth=1.0,
        label="Perfect prediction",
    )

    # Compute metrics for annotation
    mae  = mean_absolute_error(actual, pred_vals)
    rmse = np.sqrt(mean_squared_error(actual, pred_vals))
    r2   = r2_score(actual, pred_vals)

    ax.text(
        0.04, 0.95,
        f"MAE  = {round(mae, 4)} m\nRMSE = {round(rmse, 4)} m\nR²   = {round(r2, 4)}",
        transform=ax.transAxes,
        verticalalignment="top",
        fontsize=9,
        bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.8),
    )

    ax.set_title(f"{model_name}: Actual vs Predicted Water Level")
    ax.set_xlabel("Actual Water Level (m)")
    ax.set_ylabel("Predicted Water Level (m)")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()

    plot_path = PLOT_DIR / f"ext_{safe_prefix(model_name)}_scatter.png"
    plt.savefig(plot_path, dpi=300)
    plt.close()
    print(f"  Saved: {plot_path.name}")

# ============================================================
# PLOT 3 — ERROR DISTRIBUTION HISTOGRAMS (per model)
# ============================================================

print("\n" + "=" * 70)
print("GENERATING ERROR DISTRIBUTION HISTOGRAMS")
print("=" * 70)

for model_name, col in active_models.items():

    errors = actual.values - predictions[col].values

    fig, ax = plt.subplots(figsize=(9, 5))

    ax.hist(errors, bins=40, color="#4393c3", edgecolor="white", linewidth=0.4)
    ax.axvline(0, color="red", linestyle="--", linewidth=1.2, label="Zero error")
    ax.axvline(
        float(np.mean(errors)),
        color="orange",
        linestyle="--",
        linewidth=1.0,
        label=f"Mean error ({round(float(np.mean(errors)), 3)} m)",
    )

    ax.set_title(f"{model_name}: Prediction Error Distribution\n(Actual - Predicted)")
    ax.set_xlabel("Prediction Error (m)")
    ax.set_ylabel("Frequency")
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()

    plot_path = PLOT_DIR / f"ext_{safe_prefix(model_name)}_error_distribution.png"
    plt.savefig(plot_path, dpi=300)
    plt.close()
    print(f"  Saved: {plot_path.name}")

# ============================================================
# PLOT 4 — COMPARATIVE BAR CHART (all models, 3 metrics)
# ============================================================

print("\n" + "=" * 70)
print("GENERATING COMPARATIVE BAR CHART")
print("=" * 70)

model_names = results["Model"].tolist()
palette = ["#4393c3", "#f4a582", "#2ca25f", "#d6604d", "#756bb1"]
bar_colors = palette[: len(model_names)]

fig, axes = plt.subplots(1, 3, figsize=(15, 5))

# MAE
axes[0].barh(model_names, results["MAE"].values, color=bar_colors)
axes[0].set_title("MAE — lower is better")
axes[0].set_xlabel("Mean Absolute Error (m)")
axes[0].invert_yaxis()
axes[0].grid(True, axis="x", alpha=0.3)
for i, v in enumerate(results["MAE"].values):
    axes[0].text(v + 0.002, i, f"{v:.4f}", va="center", fontsize=8)

# RMSE
axes[1].barh(model_names, results["RMSE"].values, color=bar_colors)
axes[1].set_title("RMSE — lower is better")
axes[1].set_xlabel("Root Mean Squared Error (m)")
axes[1].invert_yaxis()
axes[1].grid(True, axis="x", alpha=0.3)
for i, v in enumerate(results["RMSE"].values):
    axes[1].text(v + 0.002, i, f"{v:.4f}", va="center", fontsize=8)

# R2
axes[2].barh(model_names, results["R2"].values, color=bar_colors)
axes[2].set_title("R² — higher is better")
axes[2].set_xlabel("R² Score")
axes[2].invert_yaxis()
axes[2].grid(True, axis="x", alpha=0.3)
for i, v in enumerate(results["R2"].values):
    axes[2].text(v + 0.0005, i, f"{v:.4f}", va="center", fontsize=8)

plt.suptitle(
    "Model Performance Comparison — Flood Water Level Prediction (Sri Lanka)\n"
    f"Test set: 2025 onward | {len(predictions)} observations",
    fontsize=12,
    fontweight="bold",
)
plt.tight_layout(rect=[0, 0, 1, 0.93])

comparison_plot = PLOT_DIR / "ext_model_comparison.png"
plt.savefig(comparison_plot, dpi=300)
plt.close()
print(f"  Saved: {comparison_plot.name}")

# ============================================================
# PLOT 5 — FEATURE IMPORTANCE COMPARISON (RF, GBR, ExtraTrees)
# ============================================================

if IMPORTANCE_FILE.exists():

    print("\n" + "=" * 70)
    print("GENERATING FEATURE IMPORTANCE COMPARISON")
    print("=" * 70)

    imp = pd.read_csv(IMPORTANCE_FILE)

    importance_triples = [
        ("rf_importance",  "Random Forest"),
        ("gbr_importance", "Gradient Boosting"),
        ("et_importance",  "Extra Trees"),
    ]

    fig, axes = plt.subplots(1, 3, figsize=(18, 6))

    for ax, (col, title) in zip(axes, importance_triples):
        if col not in imp.columns:
            ax.set_visible(False)
            continue

        sorted_imp = imp[["feature", col]].sort_values(col)
        ax.barh(
            sorted_imp["feature"],
            sorted_imp[col],
            color="#4393c3",
        )
        ax.set_title(f"{title}\nFeature Importance (Gini)")
        ax.set_xlabel("Importance")
        ax.grid(True, axis="x", alpha=0.3)

    plt.suptitle(
        "Feature Importance Comparison — Tree-Based Models",
        fontsize=12,
        fontweight="bold",
    )
    plt.tight_layout()

    importance_plot = PLOT_DIR / "ext_feature_importance_comparison.png"
    plt.savefig(importance_plot, dpi=300)
    plt.close()
    print(f"  Saved: {importance_plot.name}")

# ============================================================
# SAVE FINAL SUMMARY (long-format — one row per model)
# This does NOT overwrite the original final_model_summary.csv.
# ============================================================

results.to_csv(SUMMARY_FILE, index=False)
print(f"\nSaved: {SUMMARY_FILE}")

# ============================================================
# PRINT HYBRID WEIGHTS (if available)
# ============================================================

if WEIGHTS_FILE.exists():

    w = pd.read_csv(WEIGHTS_FILE).iloc[0]

    print("\n" + "=" * 70)
    print("HYBRID MODEL WEIGHTS")
    print("=" * 70)
    print(f"\n  Formula : {round(w['w_random_forest'], 4)} x RF + {round(w['w_gradient_boosting'], 4)} x GBR")
    print(f"  Method  : {w['weight_derivation_method']}")
    print(f"  Period  : {w['validation_period_start']} to {w['validation_period_end']}")
    print(f"  Test-set used for weights: {w['test_set_used_for_weights']}")

# ============================================================
# COPY SELECTED MODEL .PKL (if it has one)
# The hybrid does not have a single .pkl, so we handle that case.
# This DOES overwrite flood_prediction_model.pkl — it is the
# deployment model and is expected to be updated.
# ============================================================

MODEL_PKL_MAP = {
    "Random Forest":     "random_forest_fixed.pkl",
    "XGBoost":           "xgboost_fixed.pkl",
    "Gradient Boosting": "gradient_boosting_fixed.pkl",
    "Extra Trees":       "extra_trees_fixed.pkl",
    "RF + GB Hybrid":    None,
}

final_pkl_name   = MODEL_PKL_MAP.get(final_model_name)
final_model_file = MODEL_DIR / "flood_prediction_model.pkl"

print("\n" + "=" * 70)
print("FINAL MODEL FOR DEPLOYMENT")
print("=" * 70)

if final_pkl_name is not None:

    source = MODEL_DIR / final_pkl_name

    if source.exists():
        shutil.copy2(source, final_model_file)
        print(f"\n  Selected  : {final_model_name}")
        print(f"  Source    : {source.name}")
        print(f"  Copied to : {final_model_file.name}")
    else:
        print(
            f"\n  WARNING: Source .pkl not found: {source}"
            f"\n  Please run model_evaluation_extended.py to train and save {final_pkl_name}."
        )

else:
    print(f"\n  Selected  : {final_model_name}")
    print(
        "\n  NOTE: The hybrid model does not have a single .pkl file."
        "\n  To deploy the hybrid, load random_forest_fixed.pkl and"
        "\n  gradient_boosting_fixed.pkl, then apply weights from hybrid_weights.csv."
        "\n  flood_prediction_model.pkl has NOT been updated."
    )

# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 70)
print("STEP 14 EXTENDED COMPLETE")
print("=" * 70)

print(f"\n  Selected model (lowest RMSE): {final_model_name}")
print(f"  Plots saved to: {PLOT_DIR}")
print(f"  Summary saved: {SUMMARY_FILE.name}")

print("\nExisting baseline files — NOT MODIFIED:")
print("  outputs/ml/model_results_fixed.csv")
print("  outputs/ml/final_model_summary.csv")
print("  outputs/ml/plots/final_random_forest_actual_vs_predicted.png")
print("  outputs/ml/plots/final_random_forest_error_distribution.png")
print("  outputs/ml/plots/final_random_forest_scatter.png")
print("  outputs/ml/plots/final_xgboost_actual_vs_predicted.png")
print("  outputs/ml/plots/final_feature_importance.png")

print("\nNew extended plots (prefixed ext_):")
for model_name in active_models.keys():
    pfx = safe_prefix(model_name)
    print(f"  ext_{pfx}_actual_vs_predicted.png")
    print(f"  ext_{pfx}_scatter.png")
    print(f"  ext_{pfx}_error_distribution.png")

print("  ext_model_comparison.png")
print("  ext_feature_importance_comparison.png  (if importance file exists)")
