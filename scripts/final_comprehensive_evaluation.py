"""
=============================================================================
FINAL COMPREHENSIVE MODEL EVALUATION
FYP — Flood Water Level Prediction (Sri Lanka)

Covers ALL models: Random Forest | XGBoost | Gradient Boosting |
                   Extra Trees  | RF+GB Hybrid

REGRESSION metrics    : MAE, RMSE, R2, Max Error
CLASSIFICATION metrics: Accuracy, Macro/Weighted Precision, Recall, F1
                        Per-class Precision, Recall, F1
                        Confusion matrices (heatmaps — counts + normalised)
                        Critical risk recall comparison
                        All-models confusion matrix grid

All plots saved to: outputs/ml/plots/final_*.png
Summary CSV saved : outputs/ml/final_comprehensive_summary.csv
=============================================================================
"""

from pathlib import Path
import shutil

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)

# ─────────────────────────────────────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────────────────────────────────────

ROOT       = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "outputs" / "ml"
MODEL_DIR  = OUTPUT_DIR / "models"
PLOT_DIR   = OUTPUT_DIR / "plots"
PLOT_DIR.mkdir(parents=True, exist_ok=True)

RESULT_FILE     = OUTPUT_DIR / "model_results_extended.csv"
PREDICTION_FILE = OUTPUT_DIR / "model_predictions_extended.csv"
IMPORTANCE_FILE = OUTPUT_DIR / "feature_importance_extended.csv"
WEIGHTS_FILE    = OUTPUT_DIR / "hybrid_weights.csv"
SUMMARY_FILE    = OUTPUT_DIR / "final_comprehensive_summary.csv"

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

RISK_ORDER = ["Low", "Moderate", "High", "Very High"]
PALETTE    = ["#4393c3", "#f4a582", "#2ca25f", "#d6604d", "#756bb1"]


def classify_risk(series: pd.Series, thresholds: dict) -> pd.Series:
    labels = []
    for v in series:
        if v >= thresholds["very_high"]:
            labels.append("Very High")
        elif v >= thresholds["high"]:
            labels.append("High")
        elif v >= thresholds["moderate"]:
            labels.append("Moderate")
        else:
            labels.append("Low")
    return pd.Series(labels, index=series.index)


def risk_thresholds(series: pd.Series) -> dict:
    return {
        "moderate":  float(np.percentile(series, 60)),
        "high":      float(np.percentile(series, 80)),
        "very_high": float(np.percentile(series, 95)),
    }


def safe_prefix(name: str) -> str:
    return name.lower().replace(" ", "_").replace("+", "plus").replace("/", "_")


def sep(title: str = ""):
    print("\n" + "=" * 70)
    if title:
        print(title)
        print("=" * 70)


# ─────────────────────────────────────────────────────────────────────────────
# BANNER
# ─────────────────────────────────────────────────────────────────────────────

sep()
print("FINAL COMPREHENSIVE MODEL EVALUATION")
print("FYP — Flood Water Level Prediction (Sri Lanka)")
sep()

# ─────────────────────────────────────────────────────────────────────────────
# LOAD DATA
# ─────────────────────────────────────────────────────────────────────────────

for f in [RESULT_FILE, PREDICTION_FILE]:
    if not f.exists():
        raise FileNotFoundError(f"Required file not found: {f}")

results     = pd.read_csv(RESULT_FILE)
predictions = pd.read_csv(PREDICTION_FILE)
predictions["datetime"] = pd.to_datetime(predictions["datetime"])

MODEL_COLUMN_MAP = {
    "Random Forest":     "random_forest_prediction",
    "XGBoost":           "xgboost_prediction",
    "Gradient Boosting": "gradient_boosting_prediction",
    "Extra Trees":       "extra_trees_prediction",
    "RF+GB Hybrid":      "hybrid_rf_gb_prediction",
}

active_models = {
    name: col
    for name, col in MODEL_COLUMN_MAP.items()
    if col in predictions.columns
}
MODEL_COLORS = {name: PALETTE[i % len(PALETTE)] for i, name in enumerate(active_models)}

actual     = predictions["actual_water_level"]
thresholds = risk_thresholds(actual)
actual_risk = classify_risk(actual, thresholds)

print(f"\nModels loaded : {list(active_models.keys())}")
print(f"Test samples  : {len(predictions):,}")
print(f"\nRisk thresholds (from test-set percentiles):")
print(f"  Moderate  >= {thresholds['moderate']:.3f} m  (P60)")
print(f"  High      >= {thresholds['high']:.3f} m  (P80)")
print(f"  Very High >= {thresholds['very_high']:.3f} m  (P95)")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — REGRESSION METRICS
# ─────────────────────────────────────────────────────────────────────────────

sep("REGRESSION METRICS — ALL MODELS")
print(results.to_string(index=False))

best_rmse = results.loc[results["RMSE"].idxmin()]
best_mae  = results.loc[results["MAE"].idxmin()]
best_r2   = results.loc[results["R2"].idxmax()]

sep("BEST MODELS (REGRESSION)")
print(f"\n  Best MAE : {best_mae['Model']:22s} — {best_mae['MAE']:.4f} m")
print(f"  Best RMSE: {best_rmse['Model']:22s} — {best_rmse['RMSE']:.4f} m")
print(f"  Best R2  : {best_r2['Model']:22s} — {best_r2['R2']:.4f}")

final_model_name = best_rmse["Model"]
print(f"\n  >>> Selected deployment model (lowest RMSE): {final_model_name}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — CLASSIFICATION METRICS
# ─────────────────────────────────────────────────────────────────────────────

sep("CLASSIFICATION METRICS — ALL MODELS")
print("  Risk classes: Low | Moderate | High | Very High\n")

clf_rows = []

for model_name, col in active_models.items():
    pred_risk = classify_risk(predictions[col], thresholds)

    acc    = accuracy_score(actual_risk, pred_risk)
    mac_p  = precision_score(actual_risk, pred_risk, average="macro",    labels=RISK_ORDER, zero_division=0)
    mac_r  = recall_score   (actual_risk, pred_risk, average="macro",    labels=RISK_ORDER, zero_division=0)
    mac_f1 = f1_score       (actual_risk, pred_risk, average="macro",    labels=RISK_ORDER, zero_division=0)
    wt_p   = precision_score(actual_risk, pred_risk, average="weighted", labels=RISK_ORDER, zero_division=0)
    wt_r   = recall_score   (actual_risk, pred_risk, average="weighted", labels=RISK_ORDER, zero_division=0)
    wt_f1  = f1_score       (actual_risk, pred_risk, average="weighted", labels=RISK_ORDER, zero_division=0)

    per_p  = precision_score(actual_risk, pred_risk, average=None, labels=RISK_ORDER, zero_division=0)
    per_r  = recall_score   (actual_risk, pred_risk, average=None, labels=RISK_ORDER, zero_division=0)
    per_f1 = f1_score       (actual_risk, pred_risk, average=None, labels=RISK_ORDER, zero_division=0)

    row = {
        "Model":              model_name,
        "Accuracy":           round(acc,    4),
        "Macro_Precision":    round(mac_p,  4),
        "Macro_Recall":       round(mac_r,  4),
        "Macro_F1":           round(mac_f1, 4),
        "Weighted_Precision": round(wt_p,   4),
        "Weighted_Recall":    round(wt_r,   4),
        "Weighted_F1":        round(wt_f1,  4),
    }
    for cls, p, r, f in zip(RISK_ORDER, per_p, per_r, per_f1):
        tag = cls.replace(" ", "_")
        row[f"{tag}_Precision"] = round(p, 4)
        row[f"{tag}_Recall"]    = round(r, 4)
        row[f"{tag}_F1"]        = round(f, 4)

    clf_rows.append(row)

clf_df = pd.DataFrame(clf_rows)

summary_cols = ["Model", "Accuracy", "Macro_Precision", "Macro_Recall", "Macro_F1",
                "Weighted_Precision", "Weighted_Recall", "Weighted_F1"]
print(clf_df[summary_cols].to_string(index=False))

for model_name, col in active_models.items():
    pred_risk = classify_risk(predictions[col], thresholds)
    print(f"\n  --- {model_name} Per-Class Classification Report ---")
    print(classification_report(actual_risk, pred_risk, labels=RISK_ORDER, zero_division=0))

# ─────────────────────────────────────────────────────────────────────────────
# HYBRID WEIGHTS
# ─────────────────────────────────────────────────────────────────────────────

if WEIGHTS_FILE.exists():
    w = pd.read_csv(WEIGHTS_FILE).iloc[0]
    sep("HYBRID MODEL WEIGHTS")
    print(f"\n  Formula : {round(w['w_random_forest'],4)} x RF  +  {round(w['w_gradient_boosting'],4)} x GBR")
    print(f"  Method  : {w['weight_derivation_method']}")
    print(f"  Period  : {w['validation_period_start']} to {w['validation_period_end']}")
    print(f"  Test-set used for weights: {w['test_set_used_for_weights']}")

# =============================================================================
#  P L O T S
# =============================================================================

N_PLOT = min(500, len(predictions))

# ─────────────────────────────────────────────────────────────────────────────
# PLOT A — Actual vs Predicted line plots
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: Actual vs Predicted Line Plots")

for model_name, col in active_models.items():
    pred_vals = predictions[col].values
    mae_v  = mean_absolute_error(actual, pred_vals)
    rmse_v = np.sqrt(mean_squared_error(actual, pred_vals))
    r2_v   = r2_score(actual, pred_vals)

    fig, ax = plt.subplots(figsize=(13, 5))
    ax.plot(range(N_PLOT), actual.values[:N_PLOT],
            label="Actual", linewidth=1.0, color="#2c7bb6", zorder=3)
    ax.plot(range(N_PLOT), pred_vals[:N_PLOT],
            label=f"{model_name} Prediction", linewidth=0.85,
            alpha=0.85, color="#d7191c", zorder=2)
    ax.text(0.01, 0.97,
            f"MAE={mae_v:.4f} m  |  RMSE={rmse_v:.4f} m  |  R2={r2_v:.4f}",
            transform=ax.transAxes, va="top", fontsize=8,
            bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.75))
    ax.set_title(f"Actual vs {model_name} Predicted Water Level  (first {N_PLOT} test obs)")
    ax.set_xlabel("Test Observation Index")
    ax.set_ylabel("Water Level (m)")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    p = PLOT_DIR / f"final_{safe_prefix(model_name)}_actual_vs_predicted.png"
    plt.savefig(p, dpi=300)
    plt.close()
    print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT B — Scatter plots
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: Scatter Plots")

for model_name, col in active_models.items():
    pred_vals = predictions[col].values
    mae_v  = mean_absolute_error(actual, pred_vals)
    rmse_v = np.sqrt(mean_squared_error(actual, pred_vals))
    r2_v   = r2_score(actual, pred_vals)

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.scatter(actual, pred_vals, alpha=0.2, s=5,
               color=MODEL_COLORS[model_name], rasterized=True)
    lim = [min(actual.min(), pred_vals.min()), max(actual.max(), pred_vals.max())]
    ax.plot(lim, lim, "--", color="red", linewidth=1.0, label="Perfect fit")
    ax.text(0.04, 0.95,
            f"MAE  = {mae_v:.4f} m\nRMSE = {rmse_v:.4f} m\nR2   = {r2_v:.4f}",
            transform=ax.transAxes, va="top", fontsize=9,
            bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.85))
    ax.set_title(f"{model_name}: Actual vs Predicted Water Level")
    ax.set_xlabel("Actual Water Level (m)")
    ax.set_ylabel("Predicted Water Level (m)")
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    p = PLOT_DIR / f"final_{safe_prefix(model_name)}_scatter.png"
    plt.savefig(p, dpi=300)
    plt.close()
    print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT C — Error distribution histograms
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: Error Distribution Histograms")

for model_name, col in active_models.items():
    errors = actual.values - predictions[col].values

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.hist(errors, bins=50, color=MODEL_COLORS[model_name],
            edgecolor="white", linewidth=0.4)
    ax.axvline(0, color="red", linestyle="--", linewidth=1.2, label="Zero error")
    ax.axvline(float(np.mean(errors)), color="orange", linestyle="--",
               linewidth=1.0, label=f"Mean error ({np.mean(errors):.3f} m)")
    ax.set_title(f"{model_name}: Prediction Error Distribution  (Actual minus Predicted)")
    ax.set_xlabel("Prediction Error (m)")
    ax.set_ylabel("Frequency")
    ax.legend(fontsize=9)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    p = PLOT_DIR / f"final_{safe_prefix(model_name)}_error_distribution.png"
    plt.savefig(p, dpi=300)
    plt.close()
    print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT D — Regression comparison bar chart
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: Regression Comparison Bar Chart")

model_names = results["Model"].tolist()
bar_colors  = PALETTE[: len(model_names)]

fig, axes = plt.subplots(1, 3, figsize=(16, 5))
for ax, (metric, xlabel, better) in zip(
    axes,
    [("MAE",  "Mean Absolute Error (m)",     "lower"),
     ("RMSE", "Root Mean Squared Error (m)", "lower"),
     ("R2",   "R2 Score",                    "higher")],
):
    vals = results[metric].values
    ax.barh(model_names, vals, color=bar_colors)
    ax.set_title(f"{metric}  —  {better} is better", fontweight="bold")
    ax.set_xlabel(xlabel)
    ax.invert_yaxis()
    ax.grid(True, axis="x", alpha=0.3)
    for i, v in enumerate(vals):
        ax.text(v + max(vals) * 0.01, i, f"{v:.4f}", va="center", fontsize=8)

plt.suptitle(
    "Regression Performance Comparison — Flood Water Level Prediction\n"
    f"Test set | {len(predictions):,} observations | Sri Lanka",
    fontsize=12, fontweight="bold",
)
plt.tight_layout(rect=[0, 0, 1, 0.93])
p = PLOT_DIR / "final_regression_comparison.png"
plt.savefig(p, dpi=300)
plt.close()
print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT E — Classification overall metrics bar chart
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: Classification Metrics Bar Chart")

clf_metrics = [
    ("Accuracy",          "Accuracy",         "steelblue"),
    ("Macro_Precision",   "Macro Precision",  "#4393c3"),
    ("Macro_Recall",      "Macro Recall",     "darkorange"),
    ("Macro_F1",          "Macro F1",         "green"),
    ("Weighted_F1",       "Weighted F1",      "purple"),
]

fig, axes = plt.subplots(1, len(clf_metrics), figsize=(18, 5))
for ax, (col, label, color) in zip(axes, clf_metrics):
    vals = clf_df[col].values
    ax.barh(clf_df["Model"].tolist(), vals, color=color, alpha=0.80)
    ax.set_title(label, fontweight="bold")
    ax.set_xlabel("Score")
    ax.set_xlim(0, 1.05)
    ax.invert_yaxis()
    ax.grid(True, axis="x", alpha=0.3)
    for i, v in enumerate(vals):
        ax.text(v + 0.01, i, f"{v:.3f}", va="center", fontsize=8)

plt.suptitle(
    "Classification Performance Comparison — Risk Level Prediction\n"
    "(Low | Moderate | High | Very High)",
    fontsize=12, fontweight="bold",
)
plt.tight_layout(rect=[0, 0, 1, 0.93])
p = PLOT_DIR / "final_classification_comparison.png"
plt.savefig(p, dpi=300)
plt.close()
print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT F — Per-class Precision / Recall / F1 grouped bars (per model)
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: Per-Class Precision / Recall / F1 (per model)")

for model_name, col in active_models.items():
    pred_risk = classify_risk(predictions[col], thresholds)
    per_p  = precision_score(actual_risk, pred_risk, average=None, labels=RISK_ORDER, zero_division=0)
    per_r  = recall_score   (actual_risk, pred_risk, average=None, labels=RISK_ORDER, zero_division=0)
    per_f1 = f1_score       (actual_risk, pred_risk, average=None, labels=RISK_ORDER, zero_division=0)

    x = np.arange(len(RISK_ORDER))
    w = 0.25
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.bar(x - w, per_p,  w, label="Precision", color="#4393c3")
    ax.bar(x,     per_r,  w, label="Recall",    color="#f4a582")
    ax.bar(x + w, per_f1, w, label="F1 Score",  color="#2ca25f")
    ax.set_xticks(x)
    ax.set_xticklabels(RISK_ORDER, fontsize=10)
    ax.set_ylim(0, 1.1)
    ax.set_ylabel("Score")
    ax.set_title(f"{model_name}\nPer-Class Precision / Recall / F1 Score")
    ax.legend()
    ax.grid(True, axis="y", alpha=0.3)
    for i, (pv, rv, fv) in enumerate(zip(per_p, per_r, per_f1)):
        ax.text(i - w, pv + 0.02, f"{pv:.2f}", ha="center", fontsize=7.5)
        ax.text(i,     rv + 0.02, f"{rv:.2f}", ha="center", fontsize=7.5)
        ax.text(i + w, fv + 0.02, f"{fv:.2f}", ha="center", fontsize=7.5)
    plt.tight_layout()
    p = PLOT_DIR / f"final_{safe_prefix(model_name)}_per_class_metrics.png"
    plt.savefig(p, dpi=300)
    plt.close()
    print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT G — Confusion matrix heatmaps (counts + normalised, per model)
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: Confusion Matrix Heatmaps (per model)")

for model_name, col in active_models.items():
    pred_risk = classify_risk(predictions[col], thresholds)
    cm = confusion_matrix(actual_risk, pred_risk, labels=RISK_ORDER)

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Counts
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=RISK_ORDER, yticklabels=RISK_ORDER,
                linewidths=0.5, ax=axes[0])
    axes[0].set_title("Confusion Matrix (Counts)")
    axes[0].set_xlabel("Predicted Risk Class")
    axes[0].set_ylabel("Actual Risk Class")

    # Row-normalised (recall per class on diagonal)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)
    sns.heatmap(cm_norm, annot=True, fmt=".2f", cmap="Blues",
                xticklabels=RISK_ORDER, yticklabels=RISK_ORDER,
                vmin=0, vmax=1, linewidths=0.5, ax=axes[1])
    axes[1].set_title("Confusion Matrix (Row-Normalised)")
    axes[1].set_xlabel("Predicted Risk Class")
    axes[1].set_ylabel("Actual Risk Class")

    plt.suptitle(f"Confusion Matrix — {model_name}",
                 fontsize=12, fontweight="bold")
    plt.tight_layout(rect=[0, 0, 1, 0.95])
    p = PLOT_DIR / f"final_{safe_prefix(model_name)}_confusion_matrix.png"
    plt.savefig(p, dpi=300)
    plt.close()
    print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT H — All-models confusion matrix summary grid
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: All-Models Confusion Matrix Grid")

n_m = len(active_models)
fig, axes = plt.subplots(1, n_m, figsize=(5 * n_m, 5))
if n_m == 1:
    axes = [axes]

for ax, (model_name, col) in zip(axes, active_models.items()):
    pred_risk = classify_risk(predictions[col], thresholds)
    cm_n = confusion_matrix(actual_risk, pred_risk, labels=RISK_ORDER).astype(float)
    cm_n = cm_n / cm_n.sum(axis=1, keepdims=True)
    sns.heatmap(cm_n, annot=True, fmt=".2f", cmap="Blues",
                xticklabels=["L", "M", "H", "VH"],
                yticklabels=["L", "M", "H", "VH"],
                vmin=0, vmax=1, linewidths=0.5,
                ax=ax, cbar=False, annot_kws={"size": 8})
    ax.set_title(model_name, fontsize=9, fontweight="bold")
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")

plt.suptitle(
    "Normalised Confusion Matrices — All Models\n"
    "L=Low  M=Moderate  H=High  VH=Very High",
    fontsize=11, fontweight="bold",
)
plt.tight_layout(rect=[0, 0, 1, 0.92])
p = PLOT_DIR / "final_all_models_confusion_grid.png"
plt.savefig(p, dpi=300)
plt.close()
print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT I — Critical risk recall comparison (High + Very High)
# ─────────────────────────────────────────────────────────────────────────────

sep("GENERATING: Critical Risk Recall Comparison")

fig, ax = plt.subplots(figsize=(9, 5))
x = np.arange(len(clf_df))
w = 0.35

high_recall = clf_df["High_Recall"].values
vh_recall   = clf_df["Very_High_Recall"].values

ax.bar(x - w / 2, high_recall, w, label="High Risk Recall",     color="#f4a582")
ax.bar(x + w / 2, vh_recall,   w, label="Very High Risk Recall", color="#d6604d")
ax.set_xticks(x)
ax.set_xticklabels(clf_df["Model"], rotation=15, ha="right")
ax.set_ylim(0, 1.1)
ax.set_ylabel("Recall")
ax.set_title("Critical Risk Class Recall — High and Very High\n"
             "(Higher recall = fewer missed flood events)", fontweight="bold")
ax.legend()
ax.axhline(0.5, color="gray", linestyle="--", linewidth=0.8, alpha=0.6)
ax.grid(True, axis="y", alpha=0.3)
for i, (h, v) in enumerate(zip(high_recall, vh_recall)):
    ax.text(i - w / 2, h + 0.02, f"{h:.2f}", ha="center", fontsize=8)
    ax.text(i + w / 2, v + 0.02, f"{v:.2f}", ha="center", fontsize=8)
plt.tight_layout()
p = PLOT_DIR / "final_critical_risk_recall.png"
plt.savefig(p, dpi=300)
plt.close()
print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# PLOT J — Feature importance comparison
# ─────────────────────────────────────────────────────────────────────────────

if IMPORTANCE_FILE.exists():
    sep("GENERATING: Feature Importance Comparison")
    imp = pd.read_csv(IMPORTANCE_FILE)
    triples = [
        ("rf_importance",  "Random Forest",     "#4393c3"),
        ("gbr_importance", "Gradient Boosting", "#2ca25f"),
        ("et_importance",  "Extra Trees",       "#f4a582"),
    ]
    available = [(c, t, col) for c, t, col in triples if c in imp.columns]
    if available:
        fig, axes = plt.subplots(1, len(available), figsize=(7 * len(available), 6))
        if len(available) == 1:
            axes = [axes]
        for ax, (col, title, color) in zip(axes, available):
            top = imp[["feature", col]].sort_values(col).tail(15)
            ax.barh(top["feature"], top[col], color=color, alpha=0.85)
            ax.set_title(f"{title}\nTop-15 Feature Importance (Gini)", fontsize=10)
            ax.set_xlabel("Importance")
            ax.grid(True, axis="x", alpha=0.3)
        plt.suptitle("Feature Importance Comparison — Tree-Based Models",
                     fontsize=12, fontweight="bold")
        plt.tight_layout()
        p = PLOT_DIR / "final_feature_importance_comparison.png"
        plt.savefig(p, dpi=300)
        plt.close()
        print(f"  Saved: {p.name}")

# ─────────────────────────────────────────────────────────────────────────────
# SAVE COMPREHENSIVE SUMMARY CSV
# ─────────────────────────────────────────────────────────────────────────────

sep("SAVING COMPREHENSIVE SUMMARY CSV")

merged = results.merge(clf_df, on="Model", how="outer")
merged.to_csv(SUMMARY_FILE, index=False)
print(f"\n  Saved: {SUMMARY_FILE}")

display_cols = ["Model", "MAE", "RMSE", "R2",
                "Accuracy", "Macro_F1", "Weighted_F1",
                "High_Recall", "Very_High_Recall"]
avail = [c for c in display_cols if c in merged.columns]
print("\n  FINAL SUMMARY:")
print(merged[avail].to_string(index=False))

# ─────────────────────────────────────────────────────────────────────────────
# COPY DEPLOYMENT MODEL
# ─────────────────────────────────────────────────────────────────────────────

sep("DEPLOYMENT MODEL")

PKL_MAP = {
    "Random Forest":     "random_forest_fixed.pkl",
    "XGBoost":           "xgboost_fixed.pkl",
    "Gradient Boosting": "gradient_boosting_fixed.pkl",
    "Extra Trees":       "extra_trees_fixed.pkl",
    "RF+GB Hybrid":      None,
}

final_pkl   = PKL_MAP.get(final_model_name)
deploy_file = MODEL_DIR / "flood_prediction_model.pkl"

if final_pkl:
    src = MODEL_DIR / final_pkl
    if src.exists():
        shutil.copy2(src, deploy_file)
        print(f"\n  Selected : {final_model_name}")
        print(f"  Source   : {src.name}")
        print(f"  Deployed : {deploy_file.name}")
    else:
        print(f"\n  WARNING: {src.name} not found — skipping deployment copy.")
else:
    print(f"\n  {final_model_name} is a hybrid model — no single .pkl file.")
    print("  To deploy: load random_forest_fixed.pkl + gradient_boosting_fixed.pkl")
    print("  and apply weights from hybrid_weights.csv.")

# ─────────────────────────────────────────────────────────────────────────────
# COMPLETE
# ─────────────────────────────────────────────────────────────────────────────

sep("COMPLETE")

print(f"\n  Deployment model : {final_model_name}  (lowest RMSE)")
print(f"  Summary CSV      : {SUMMARY_FILE.name}")
print(f"  All plots saved  : {PLOT_DIR}")

print("\n  Plots generated:")
for pl in sorted(PLOT_DIR.glob("final_*.png")):
    print(f"    {pl.name}")
