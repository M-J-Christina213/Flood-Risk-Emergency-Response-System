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

from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor


# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

DATA_FILE = ROOT / "outputs" / "ml_features.csv"

OUTPUT_DIR = ROOT / "outputs" / "ml"
MODEL_DIR = OUTPUT_DIR / "models"
PLOT_DIR = OUTPUT_DIR / "plots"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
PLOT_DIR.mkdir(parents=True, exist_ok=True)


print("=" * 70)
print("STEP 10 - MODEL TRAINING, EVALUATION & VISUALIZATION")
print("=" * 70)


# ============================================================
# 1. LOAD DATA
# ============================================================

print("\nLoading dataset:")
print(DATA_FILE)

df = pd.read_csv(DATA_FILE)

df["datetime"] = pd.to_datetime(df["datetime"])

df = df.sort_values("datetime").reset_index(drop=True)

print("\nDataset shape:")
print(df.shape)

print("\nDate range:")
print(df["datetime"].min())
print(df["datetime"].max())


# ============================================================
# 2. FEATURES
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
# 3. REMOVE MISSING VALUES
# ============================================================

model_df = df[
    features + [target, "datetime"]
].copy()

model_df = model_df.dropna()

print("\nRows after removing missing values:")
print(len(model_df))


# ============================================================
# 4. TIME-BASED TRAIN / TEST SPLIT
# ============================================================

print("\n" + "=" * 70)
print("TIME-BASED DATA SPLIT")
print("=" * 70)

train = model_df[
    model_df["datetime"] < "2025-01-01"
]

test = model_df[
    model_df["datetime"] >= "2025-01-01"
]

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


X_train = train[features]
y_train = train[target]

X_test = test[features]
y_test = test[target]


# ============================================================
# 5. RANDOM FOREST
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
# 6. XGBOOST
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
# 7. MODEL COMPARISON
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

best_model = results_df.loc[
    results_df["RMSE"].idxmin(),
    "Model"
]

print("\nBest model based on RMSE:")
print(best_model)


# ============================================================
# 8. SAVE MODEL RESULTS
# ============================================================

results_file = OUTPUT_DIR / "model_results.csv"

results_df.to_csv(
    results_file,
    index=False
)

print("\nSaved:")
print(results_file)


# ============================================================
# 9. SAVE PREDICTIONS
# ============================================================

prediction_df = test[
    ["datetime", "target_water_level"]
].copy()

prediction_df.rename(
    columns={
        "target_water_level":
        "actual_water_level"
    },
    inplace=True
)

prediction_df[
    "random_forest_prediction"
] = rf_pred

prediction_df[
    "xgboost_prediction"
] = xgb_pred

prediction_df[
    "rf_error"
] = (
    prediction_df["actual_water_level"]
    - prediction_df["random_forest_prediction"]
)

prediction_df[
    "xgb_error"
] = (
    prediction_df["actual_water_level"]
    - prediction_df["xgboost_prediction"]
)

prediction_file = OUTPUT_DIR / "model_predictions.csv"

prediction_df.to_csv(
    prediction_file,
    index=False
)

print("\nSaved:")
print(prediction_file)


# ============================================================
# 10. SAVE RANDOM FOREST MODEL
# ============================================================

rf_file = MODEL_DIR / "random_forest.pkl"

joblib.dump(
    rf,
    rf_file
)

print("\nSaved:")
print(rf_file)


# ============================================================
# 11. SAVE XGBOOST MODEL
# ============================================================

xgb_file = MODEL_DIR / "xgboost.pkl"

joblib.dump(
    xgb,
    xgb_file
)

print("\nSaved:")
print(xgb_file)


# ============================================================
# 12. ACTUAL VS RANDOM FOREST
# ============================================================

plt.figure(figsize=(15, 6))

plt.plot(
    prediction_df["datetime"],
    prediction_df["actual_water_level"],
    label="Actual Water Level"
)

plt.plot(
    prediction_df["datetime"],
    prediction_df["random_forest_prediction"],
    label="Random Forest Prediction"
)

plt.xlabel("Date")
plt.ylabel("Water Level (m)")

plt.title(
    "Actual vs Random Forest Predicted Water Levels"
)

plt.legend()
plt.grid(True)

plt.xticks(rotation=45)

plt.tight_layout()

rf_plot = PLOT_DIR / "actual_vs_random_forest.png"

plt.savefig(
    rf_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(rf_plot)


# ============================================================
# 13. ACTUAL VS XGBOOST
# ============================================================

plt.figure(figsize=(15, 6))

plt.plot(
    prediction_df["datetime"],
    prediction_df["actual_water_level"],
    label="Actual Water Level"
)

plt.plot(
    prediction_df["datetime"],
    prediction_df["xgboost_prediction"],
    label="XGBoost Prediction"
)

plt.xlabel("Date")
plt.ylabel("Water Level (m)")

plt.title(
    "Actual vs XGBoost Predicted Water Levels"
)

plt.legend()
plt.grid(True)

plt.xticks(rotation=45)

plt.tight_layout()

xgb_plot = PLOT_DIR / "actual_vs_xgboost.png"

plt.savefig(
    xgb_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(xgb_plot)


# ============================================================
# 14. ACTUAL VS PREDICTED SCATTER
# ============================================================

plt.figure(figsize=(8, 8))

plt.scatter(
    prediction_df["actual_water_level"],
    prediction_df["random_forest_prediction"],
    alpha=0.4
)

min_value = min(
    prediction_df["actual_water_level"].min(),
    prediction_df["random_forest_prediction"].min()
)

max_value = max(
    prediction_df["actual_water_level"].max(),
    prediction_df["random_forest_prediction"].max()
)

plt.plot(
    [min_value, max_value],
    [min_value, max_value],
    linestyle="--"
)

plt.xlabel("Actual Water Level (m)")
plt.ylabel("Predicted Water Level (m)")

plt.title(
    "Random Forest: Actual vs Predicted Water Level"
)

plt.grid(True)

plt.tight_layout()

scatter_plot = PLOT_DIR / "random_forest_actual_vs_predicted.png"

plt.savefig(
    scatter_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(scatter_plot)


# ============================================================
# 15. ERROR DISTRIBUTION
# ============================================================

plt.figure(figsize=(10, 6))

plt.hist(
    prediction_df["rf_error"],
    bins=50
)

plt.xlabel("Prediction Error (m)")
plt.ylabel("Frequency")

plt.title(
    "Random Forest Prediction Error Distribution"
)

plt.grid(True)

plt.tight_layout()

error_plot = PLOT_DIR / "random_forest_error_distribution.png"

plt.savefig(
    error_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(error_plot)


# ============================================================
# 16. FEATURE IMPORTANCE
# ============================================================

importance_df = pd.DataFrame({

    "feature": features,

    "importance": rf.feature_importances_

})

importance_df = importance_df.sort_values(
    "importance",
    ascending=False
)

importance_file = OUTPUT_DIR / "feature_importance.csv"

importance_df.to_csv(
    importance_file,
    index=False
)

print("\nFeature importance:")
print(
    importance_df.to_string(
        index=False
    )
)

plt.figure(figsize=(10, 7))

plt.barh(
    importance_df["feature"],
    importance_df["importance"]
)

plt.xlabel("Importance")

plt.ylabel("Feature")

plt.title(
    "Random Forest Feature Importance"
)

plt.gca().invert_yaxis()

plt.tight_layout()

importance_plot = PLOT_DIR / "feature_importance.png"

plt.savefig(
    importance_plot,
    dpi=300
)

plt.close()

print("\nSaved:")
print(importance_plot)


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 70)
print("STEP 10 COMPLETE")
print("=" * 70)

print("\nOutput directory:")
print(OUTPUT_DIR)

print("\nFiles created:")

print(" - model_results.csv")
print(" - model_predictions.csv")
print(" - feature_importance.csv")
print(" - models/random_forest.pkl")
print(" - models/xgboost.pkl")
print(" - plots/actual_vs_random_forest.png")
print(" - plots/actual_vs_xgboost.png")
print(" - plots/random_forest_actual_vs_predicted.png")
print(" - plots/random_forest_error_distribution.png")
print(" - plots/feature_importance.png")