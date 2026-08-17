from pathlib import Path
import pandas as pd
import numpy as np

print("=" * 70)
print("STEP 11 - VERIFY NEXT-STEP FORECAST TARGET")
print("=" * 70)

# -------------------------------------------------------
# PATHS
# -------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

DATA_FILE = ROOT / "outputs" / "ml_features.csv"

# -------------------------------------------------------
# LOAD DATA
# -------------------------------------------------------

df = pd.read_csv(DATA_FILE)

df["datetime"] = pd.to_datetime(df["datetime"])

df = df.sort_values(
    ["station", "datetime"]
).reset_index(drop=True)

# -------------------------------------------------------
# CREATE EXPECTED NEXT WATER LEVEL
# -------------------------------------------------------

df["expected_next_water_level"] = (
    df.groupby("station")["water_level_current"]
    .shift(-1)
)

# -------------------------------------------------------
# COMPARE
# -------------------------------------------------------

comparison = df[
    [
        "station",
        "datetime",
        "water_level_current",
        "target_water_level",
        "expected_next_water_level"
    ]
].copy()

comparison["difference"] = (
    comparison["target_water_level"]
    - comparison["expected_next_water_level"]
).abs()

valid = comparison.dropna(
    subset=[
        "target_water_level",
        "expected_next_water_level"
    ]
)

print("\nTotal rows:", len(df))
print("Comparable rows:", len(valid))

print(
    "\nMaximum difference:",
    valid["difference"].max()
)

print(
    "Mean difference:",
    valid["difference"].mean()
)

exact_matches = (
    valid["difference"] == 0
).sum()

print(
    "Exact matches:",
    exact_matches
)

print(
    "Percentage exact:",
    round(
        exact_matches / len(valid) * 100,
        2
    ),
    "%"
)

# -------------------------------------------------------
# SHOW EXAMPLES
# -------------------------------------------------------

print("\nFirst 20 comparisons:")

print(
    comparison.head(20).to_string(
        index=False
    )
)

# -------------------------------------------------------
# SAVE
# -------------------------------------------------------

output_file = ROOT / "outputs" / "ml" / "target_verification.csv"

comparison.to_csv(
    output_file,
    index=False
)

print("\nSaved:")
print(output_file)

print("\n" + "=" * 70)
print("STEP 11 COMPLETE")
print("=" * 70)