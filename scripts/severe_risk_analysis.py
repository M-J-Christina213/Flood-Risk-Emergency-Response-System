import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.metrics import confusion_matrix
import json

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "outputs" / "ml_features_fixed.csv"
PREDICTION_FILE = ROOT / "outputs" / "ml" / "model_predictions_extended.csv"
OUT_CSV = ROOT / "outputs" / "ml" / "severe_risk_error_analysis.csv"

def calculate_risk(predicted_level, current_level, alert_level, minor_flood_level, major_flood_level):
    if pd.notna(major_flood_level) and predicted_level >= major_flood_level:
        return "Very High"
    if pd.notna(minor_flood_level) and predicted_level >= minor_flood_level:
        return "High"
    if pd.notna(alert_level) and predicted_level >= alert_level:
        return "Moderate"
    if predicted_level > current_level * 1.20:
        return "Moderate"
    if predicted_level > current_level * 1.05:
        return "Low"
    return "Low"

def main():
    print("Loading data...")
    df = pd.read_csv(DATA_FILE)
    df["datetime"] = pd.to_datetime(df["datetime"])
    df = df.sort_values(["station", "datetime"]).reset_index(drop=True)
    
    features = [
        "water_level_current", "water_level_previous", "water_level_lag_1",
        "water_level_lag_2", "water_level_lag_3", "rainfall_12hr", "rainfall_lag_1",
        "rainfall_lag_2", "rainfall_rolling_3", "water_level_rolling_3", "hour_sin",
        "hour_cos", "month_sin", "month_cos", "alert_level", "minor_flood_level",
        "major_flood_level"
    ]
    target = "target_water_level"
    features = [f for f in features if f in df.columns]
    model_df = df[features + [target, "datetime", "station"]].copy().dropna()
    test_df = model_df[model_df["datetime"] >= "2025-01-01"].copy().reset_index(drop=True)
    
    pred_df = pd.read_csv(PREDICTION_FILE).reset_index(drop=True)
    
    if len(test_df) != len(pred_df):
        print(f"Warning: test_df has {len(test_df)} rows, pred_df has {len(pred_df)} rows.")
        return
        
    if "hybrid_rf_gb_prediction" not in pred_df.columns:
        print("Calculating hybrid dynamically (W_RF=0.503818, W_GB=0.496182)...")
        pred_df["hybrid_rf_gb_prediction"] = (0.503818 * pred_df["random_forest_prediction"]) + (0.496182 * pred_df["gradient_boosting_prediction"])
        
    analysis_records = []
    y_true_labels = []
    y_rf_labels = []
    y_hybrid_labels = []
    
    for i in range(len(test_df)):
        row = test_df.iloc[i]
        curr = row["water_level_current"]
        alt = row["alert_level"]
        min_f = row["minor_flood_level"]
        maj_f = row["major_flood_level"]
        
        act = pred_df.iloc[i]["actual_water_level"]
        rf_p = pred_df.iloc[i]["random_forest_prediction"]
        gb_p = pred_df.iloc[i]["gradient_boosting_prediction"]
        hy_p = pred_df.iloc[i]["hybrid_rf_gb_prediction"]
        
        act_risk = calculate_risk(act, curr, alt, min_f, maj_f)
        rf_risk = calculate_risk(rf_p, curr, alt, min_f, maj_f)
        gb_risk = calculate_risk(gb_p, curr, alt, min_f, maj_f)
        hy_risk = calculate_risk(hy_p, curr, alt, min_f, maj_f)
        
        y_true_labels.append(act_risk)
        y_rf_labels.append(rf_risk)
        y_hybrid_labels.append(hy_risk)
        
        if act_risk in ["High", "Very High"]:
            analysis_records.append({
                "datetime": row["datetime"],
                "station": row["station"],
                "actual_water_level": act,
                "rf_prediction": rf_p,
                "gb_prediction": gb_p,
                "hybrid_prediction": hy_p,
                "actual_risk": act_risk,
                "rf_risk": rf_risk,
                "gb_risk": gb_risk,
                "hybrid_risk": hy_risk,
                "alert_level": alt,
                "minor_flood_level": min_f,
                "major_flood_level": maj_f
            })
            
    analysis_df = pd.DataFrame(analysis_records)
    analysis_df.to_csv(OUT_CSV, index=False)
    
    # Calculate Very High Stats
    very_high_actual = analysis_df[analysis_df["actual_risk"] == "Very High"]
    n_very_high = len(very_high_actual)
    
    rf_tp = len(very_high_actual[very_high_actual["rf_risk"] == "Very High"])
    gb_tp = len(very_high_actual[very_high_actual["gb_risk"] == "Very High"])
    hy_tp = len(very_high_actual[very_high_actual["hybrid_risk"] == "Very High"])
    
    rf_fn = n_very_high - rf_tp
    gb_fn = n_very_high - gb_tp
    hy_fn = n_very_high - hy_tp
    
    print("\n--- VERY HIGH RISK ANALYSIS ---")
    print(f"Total Very High Events: {n_very_high}")
    print(f"RF True Positives: {rf_tp} | False Negatives: {rf_fn}")
    print(f"GB True Positives: {gb_tp} | False Negatives: {gb_fn}")
    print(f"Hybrid True Positives: {hy_tp} | False Negatives: {hy_fn}")
    
    # Cases where RF gets it right but GB/Hybrid miss
    specific_cases = very_high_actual[
        (very_high_actual["rf_risk"] == "Very High") &
        (very_high_actual["gb_risk"].isin(["High", "Moderate"])) &
        (very_high_actual["hybrid_risk"].isin(["High", "Moderate"]))
    ]
    
    print(f"\nNumber of cases where RF=Very High, but GB/Hybrid=High/Moderate: {len(specific_cases)}")
    if len(specific_cases) > 0:
        print("Sample of these cases:")
        print(specific_cases[["actual_water_level", "rf_prediction", "gb_prediction", "hybrid_prediction", "major_flood_level"]].head(5))
        
    labels_order = ["Low", "Moderate", "High", "Very High"]
    cm_rf = confusion_matrix(y_true_labels, y_rf_labels, labels=labels_order)
    cm_hy = confusion_matrix(y_true_labels, y_hybrid_labels, labels=labels_order)
    
    print("\n--- CONFUSION MATRIX: RANDOM FOREST ---")
    print(cm_rf)
    print("\n--- CONFUSION MATRIX: HYBRID ---")
    print(cm_hy)
    
    print(f"\nSevere risk error analysis saved to {OUT_CSV}")

if __name__ == "__main__":
    main()
