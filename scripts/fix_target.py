from pathlib import Path
import pandas as pd
import numpy as np

print("=" * 70)
print("STEP 12 - FIXING NEXT-STEP FORECAST TARGET")
print("=" * 70)

# -------------------------------------------------------
# PATHS
# -------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = ROOT / "outputs" / "ml_features.csv"
OUTPUT_FILE = ROOT / "outputs" / "ml_features_fixed.csv"

# -------------------------------------------------------
# LOAD
# -------------------------------------------------------

df = pd.read_csv(INPUT_FILE)

df["datetime"] = pd.to_datetime(df["datetime"])

print("\nOriginal shape:")
print(df.shape)

# -------------------------------------------------------
# SORT CORRECTLY
# -------------------------------------------------------

df = df.sort_values(
    ["station", "datetime"]
).reset_index(drop=True)

# -------------------------------------------------------
# CREATE TRUE NEXT-OBSERVATION TARGET
# -------------------------------------------------------

df["target_water_level"] = (
    df.groupby("station")["water_level_current"]
      .shift(-1)
)

# -------------------------------------------------------
# REMOVE LAST OBSERVATION OF EACH STATION
# -------------------------------------------------------

before = len(df)

df = df.dropna(
    subset=["target_water_level"]
).reset_index(drop=True)

after = len(df)

print("\nRows before target shift:")
print(before)

print("\nRows after removing final observation per station:")
print(after)

print("\nRows removed:")
print(before - after)

# -------------------------------------------------------
# VERIFY
# -------------------------------------------------------

df["expected_next_water_level"] = (
    df.groupby("station")["water_level_current"]
      .shift(-1)
)

comparison = (
    df["target_water_level"]
    - df["expected_next_water_level"]
).abs()

print("\n" + "=" * 70)
print("TARGET VERIFICATION")
print("=" * 70)

print("\nMaximum difference:")
print(comparison.max())

print("\nMean difference:")
print(comparison.mean())

print("\nExact matches:")
print((comparison == 0).sum())

print("\nPercentage exact:")
print(
    round(
        (comparison == 0).mean() * 100,
        2
    ),
    "%"
)

# -------------------------------------------------------
# SHOW EXAMPLE
# -------------------------------------------------------

print("\n" + "=" * 70)
print("EXAMPLE - FIRST 20 OBSERVATIONS")
print("=" * 70)

print(
    df[
        [
            "datetime",
            "station",
            "water_level_current",
            "target_water_level"
        ]
    ].head(20).to_string(index=False)
)

# -------------------------------------------------------
# REMOVE TEMP COLUMN
# -------------------------------------------------------

df = df.drop(
    columns=["expected_next_water_level"]
)

# -------------------------------------------------------
# SAVE
# -------------------------------------------------------

df.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n" + "=" * 70)
print("STEP 12 COMPLETE")
print("=" * 70)

print("\nSaved:")
print(OUTPUT_FILE)

print("\nFinal shape:")
print(df.shape)