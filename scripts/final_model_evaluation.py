from pathlib import Path
import pandas as pd

print("=" * 70)
print("STEP 13 - FINAL MODEL EVALUATION SUMMARY")
print("=" * 70)

ROOT = Path(__file__).resolve().parent.parent

RESULT_FILE = ROOT / "outputs" / "ml" / "model_results.csv"
IMPORTANCE_FILE = ROOT / "outputs" / "ml" / "feature_importance.csv"

results = pd.read_csv(RESULT_FILE)

print("\nMODEL RESULTS")
print("=" * 70)

print(results.to_string(index=False))

# -------------------------------------------------------
# BEST MODELS
# -------------------------------------------------------

best_mae = results.loc[
    results["MAE"].idxmin()
]

best_rmse = results.loc[
    results["RMSE"].idxmin()
]

best_r2 = results.loc[
    results["R2"].idxmax()
]

print("\nBest model by MAE:")
print(best_mae["Model"], "-", round(best_mae["MAE"], 4))

print("\nBest model by RMSE:")
print(best_rmse["Model"], "-", round(best_rmse["RMSE"], 4))

print("\nBest model by R²:")
print(best_r2["Model"], "-", round(best_r2["R2"], 4))

# -------------------------------------------------------
# FINAL MODEL
# -------------------------------------------------------

if (
    best_rmse["Model"]
    == best_r2["Model"]
    == best_mae["Model"]
):

    final_model = best_rmse["Model"]

else:

    final_model = best_rmse["Model"]

print("\n" + "=" * 70)
print("FINAL MODEL SELECTION")
print("=" * 70)

print("\nSelected model:")
print(final_model)

print("\nReason:")
print(
    "Selected based primarily on lowest RMSE, "
    "with consideration of MAE and R²."
)

# -------------------------------------------------------
# FEATURE IMPORTANCE
# -------------------------------------------------------

if IMPORTANCE_FILE.exists():

    importance = pd.read_csv(
        IMPORTANCE_FILE
    )

    print("\n" + "=" * 70)
    print("TOP 10 FEATURES")
    print("=" * 70)

    print(
        importance
        .head(10)
        .to_string(index=False)
    )

# -------------------------------------------------------
# FINAL SUMMARY
# -------------------------------------------------------

print("\n" + "=" * 70)
print("RECOMMENDED MODEL FOR WEB APPLICATION")
print("=" * 70)

print(final_model)

print("\n" + "=" * 70)
print("STEP 13 COMPLETE")
print("=" * 70)