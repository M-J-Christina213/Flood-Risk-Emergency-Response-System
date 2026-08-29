import pandas as pd
import numpy as np
import json
from pathlib import Path
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "outputs" / "ml_features_fixed.csv"
PREDICTION_FILE = ROOT / "outputs" / "ml" / "model_predictions_extended.csv"
OUT_CSV = ROOT / "outputs" / "ml" / "classification_evaluation_results.csv"
OUT_JSON = ROOT / "outputs" / "ml" / "classification_confusion_matrix.json"

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
        print(f"Warning: test_df has {len(test_df)} rows, pred_df has {len(pred_df)} rows. Exiting.")
        return
        
    models = [
        ("random_forest", "random_forest_prediction"),
        ("gradient_boosting", "gradient_boosting_prediction"),
        ("xgboost", "xgboost_prediction"),
        ("extra_trees", "extra_trees_prediction"),
        ("hybrid", "hybrid_rf_gb_prediction")
    ]
    
    # Calculate hybrid manually since the hybrid_model.py failed to save
    # Weights from the log: w_RF = 0.503818, w_GBR = 0.496182
    if "hybrid_rf_gb_prediction" not in pred_df.columns:
        print("Calculating hybrid prediction dynamically...")
        pred_df["hybrid_rf_gb_prediction"] = (0.503818 * pred_df["random_forest_prediction"]) + (0.496182 * pred_df["gradient_boosting_prediction"])
        
    y_true_labels = []
    y_pred_labels = {m[0]: [] for m in models}
    
    labels_order = ["Low", "Moderate", "High", "Very High"]
    
    print("Applying risk threshold mapping...")
    for i in range(len(test_df)):
        row = test_df.iloc[i]
        curr = row["water_level_current"]
        alt = row["alert_level"]
        min_f = row["minor_flood_level"]
        maj_f = row["major_flood_level"]
        
        act = pred_df.iloc[i]["actual_water_level"]
        y_true_labels.append(calculate_risk(act, curr, alt, min_f, maj_f))
        
        for m_name, m_col in models:
            pred = pred_df.iloc[i][m_col]
            y_pred_labels[m_name].append(calculate_risk(pred, curr, alt, min_f, maj_f))
            
    results = []
    matrices = {}
    
    for m_name, m_col in models:
        y_pred = y_pred_labels[m_name]
        
        acc = accuracy_score(y_true_labels, y_pred)
        prec = precision_score(y_true_labels, y_pred, average="macro", labels=labels_order, zero_division=0)
        rec = recall_score(y_true_labels, y_pred, average="macro", labels=labels_order, zero_division=0)
        f1 = f1_score(y_true_labels, y_pred, average="macro", labels=labels_order, zero_division=0)
        
        # Calculate per-class recall for High and Very High
        # precision_recall_fscore_support could be used, but this is simple:
        recalls = recall_score(y_true_labels, y_pred, average=None, labels=labels_order, zero_division=0)
        high_idx = labels_order.index("High")
        very_high_idx = labels_order.index("Very High")
        
        high_rec = recalls[high_idx]
        vhigh_rec = recalls[very_high_idx]
        
        results.append({
            "Model": m_name,
            "Accuracy": acc,
            "Macro_Precision": prec,
            "Macro_Recall": rec,
            "Macro_F1": f1,
            "High_Risk_Recall": high_rec,
            "Very_High_Risk_Recall": vhigh_rec
        })
        
        cm = confusion_matrix(y_true_labels, y_pred, labels=labels_order)
        matrices[m_name] = cm.tolist()
        
    res_df = pd.DataFrame(results)
    res_df.to_csv(OUT_CSV, index=False)
    print(res_df)
    
    with open(OUT_JSON, "w") as f:
        json.dump({"labels": labels_order, "matrices": matrices}, f, indent=4)
        
    print(f"Results saved to {OUT_CSV}")
    print(f"Confusion matrices saved to {OUT_JSON}")

if __name__ == "__main__":
    main()
