from pathlib import Path
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent

FILE = ROOT / "outputs" / "clean_water_levels.csv"


print("=" * 70)
print("FINAL ML DATA VALIDATION")
print("=" * 70)


df = pd.read_csv(FILE)


# ------------------------------------------------------------
# BASIC
# ------------------------------------------------------------

print("\nShape:")
print(df.shape)


print("\nDate range:")

df["datetime"] = pd.to_datetime(
    df["datetime"],
    errors="coerce"
)

print(df["datetime"].min())
print(df["datetime"].max())


# ------------------------------------------------------------
# STATIONS
# ------------------------------------------------------------

print("\nNumber of stations:")

print(
    df["station"].nunique()
)


print("\nTop 20 stations:")

print(
    df["station"]
    .value_counts()
    .head(20)
)


# ------------------------------------------------------------
# WATER LEVEL
# ------------------------------------------------------------

print("\nWater level statistics:")

print(
    df["water_level_current"]
    .describe()
)


# ------------------------------------------------------------
# RAINFALL
# ------------------------------------------------------------

print("\nRainfall statistics:")

print(
    df["rainfall_12hr"]
    .describe()
)


print(
    "\nPercentage of rainfall values equal to zero:"
)

zero_rainfall = (
    df["rainfall_12hr"] == 0
).mean() * 100

print(
    f"{zero_rainfall:.2f}%"
)


# ------------------------------------------------------------
# WATER LEVEL ZERO/NEGATIVE
# ------------------------------------------------------------

print(
    "\nNegative water-level observations:"
)

negative = (
    df["water_level_current"] < 0
).sum()

print(negative)


# ------------------------------------------------------------
# DUPLICATES
# ------------------------------------------------------------

print(
    "\nDuplicate datetime/station combinations:"
)

duplicates = df.duplicated(
    subset=[
        "datetime",
        "station"
    ]
).sum()

print(duplicates)


# ------------------------------------------------------------
# SAMPLE RANDOM ROWS
# ------------------------------------------------------------

print("\nRandom sample:")

print(
    df[
        [
            "datetime",
            "river_basin",
            "river",
            "station",
            "unit",
            "water_level_previous",
            "water_level_current",
            "rainfall_12hr",
            "trend"
        ]
    ]
    .sample(
        min(20, len(df)),
        random_state=42
    )
    .to_string(index=False)
)


# ------------------------------------------------------------
# HIGH WATER LEVELS
# ------------------------------------------------------------

print(
    "\nHighest water-level observations:"
)

print(
    df[
        [
            "datetime",
            "station",
            "water_level_current",
            "rainfall_12hr"
        ]
    ]
    .sort_values(
        "water_level_current",
        ascending=False
    )
    .head(20)
    .to_string(index=False)
)


print("\nVALIDATION COMPLETE.")