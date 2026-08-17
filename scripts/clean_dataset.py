from pathlib import Path
import pandas as pd
import numpy as np


# ============================================================
# PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = ROOT / "outputs" / "water_levels_raw.csv"

OUTPUT_FILE = ROOT / "outputs" / "clean_water_levels.csv"


# ============================================================
# LOAD DATA
# ============================================================

print("=" * 70)
print("CLEANING WATER LEVEL DATASET")
print("=" * 70)

print("\nLoading:")
print(INPUT_FILE)

df = pd.read_csv(INPUT_FILE)

print(f"\nOriginal rows: {len(df)}")


# ============================================================
# YEAR FROM SOURCE FILE
# ============================================================

df["source_file"] = df["source_file"].astype(str)

df["year"] = pd.to_numeric(
    df["source_file"].str.extract(
        r"Flood_Level[\\/](\d{4})"
    )[0],
    errors="coerce"
)


# ============================================================
# KEEP 2020-2026
# ============================================================

print("\nRows by year BEFORE filtering:")

print(
    df["year"]
    .value_counts()
    .sort_index()
)


df = df[
    df["year"].between(2020, 2026)
].copy()


print(
    f"\nRows after selecting 2020-2026: "
    f"{len(df)}"
)


# ============================================================
# NUMERIC COLUMNS
# ============================================================

numeric_columns = [

    "alert_level",

    "minor_flood_level",

    "major_flood_level",

    "water_level_previous",

    "water_level_current",

    "rainfall_12hr"

]


for column in numeric_columns:

    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )


# ============================================================
# DATE AND TIME
# ============================================================

df["date"] = pd.to_datetime(
    df["date"],
    errors="coerce"
)


df["time"] = df["time"].astype(str)


# ============================================================
# REMOVE INVALID ROWS
# ============================================================

print("\nMissing values BEFORE cleaning:")

print(
    df[
        [
            "date",
            "station",
            "water_level_current"
        ]
    ]
    .isna()
    .sum()
)


# We need these for time-series modelling

df = df.dropna(
    subset=[
        "date",
        "station",
        "water_level_current"
    ]
)


# ============================================================
# REMOVE IMPOSSIBLE WATER LEVELS
# ============================================================

before = len(df)


df = df[
    df["water_level_current"]
    .between(-20, 100)
]


print(
    "\nExtreme/invalid water levels removed:",
    before - len(df)
)


# ============================================================
# RAINFALL
# ============================================================

# Missing rainfall means no usable rainfall value.
# For ML, we will initially treat it as 0.

df["rainfall_12hr"] = (
    df["rainfall_12hr"]
    .fillna(0)
)


# ============================================================
# CLEAN TEXT
# ============================================================

text_columns = [

    "river_basin",
    "river",
    "station",
    "unit",
    "remarks",
    "trend"

]


for column in text_columns:

    df[column] = (
        df[column]
        .fillna("")
        .astype(str)
        .str.replace(
            r"\s+",
            " ",
            regex=True
        )
        .str.strip()
    )


# ============================================================
# SORT CHRONOLOGICALLY
# ============================================================

df = df.sort_values(
    [
        "station",
        "date",
        "time"
    ]
).reset_index(
    drop=True
)


# ============================================================
# CREATE DATETIME
# ============================================================

df["datetime"] = pd.to_datetime(
    df["date"].dt.strftime("%Y-%m-%d")
    + " "
    + df["time"],
    errors="coerce"
)


# Remove rows where datetime failed

df = df.dropna(
    subset=["datetime"]
)


# ============================================================
# REMOVE DUPLICATES
# ============================================================

before = len(df)


df = df.drop_duplicates(
    subset=[
        "datetime",
        "station",
        "water_level_current"
    ]
)


print(
    "\nDuplicate observations removed:",
    before - len(df)
)


# ============================================================
# FEATURE ENGINEERING
# ============================================================

df["year"] = df["datetime"].dt.year

df["month"] = df["datetime"].dt.month

df["day"] = df["datetime"].dt.day

df["hour"] = df["datetime"].dt.hour

df["day_of_week"] = (
    df["datetime"].dt.dayofweek
)


# ============================================================
# SAVE
# ============================================================

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("CLEANING COMPLETE")
print("=" * 70)

print(
    f"\nFinal rows: {len(df)}"
)

print(
    f"Final columns: {len(df.columns)}"
)


print("\nRows by year:")

print(
    df["year"]
    .value_counts()
    .sort_index()
)


print("\nNumber of stations:")

print(
    df["station"]
    .nunique()
)


print("\nWater level statistics:")

print(
    df["water_level_current"]
    .describe()
)


print(
    f"\nSaved dataset:\n{OUTPUT_FILE}"
)


print("\nFirst 10 rows:")

print(
    df[
        [
            "datetime",
            "station",
            "water_level_current",
            "rainfall_12hr"
        ]
    ]
    .head(10)
    .to_string(index=False)
)