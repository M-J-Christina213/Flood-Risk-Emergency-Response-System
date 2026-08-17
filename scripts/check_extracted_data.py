from pathlib import Path
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent

CSV_FILE = ROOT / "outputs" / "water_levels_raw.csv"


print("=" * 70)
print("CHECKING EXTRACTED DATA")
print("=" * 70)


df = pd.read_csv(CSV_FILE)


print("\nTotal rows:")
print(len(df))


print("\nColumns:")
print(df.columns.tolist())


# ------------------------------------------------------------
# Convert source file to string
# ------------------------------------------------------------

df["source_file"] = df["source_file"].astype(str)


# ------------------------------------------------------------
# Extract year
# ------------------------------------------------------------

df["year"] = df["source_file"].str.extract(
    r"Flood_Level[\\/](\d{4})"
)


print("\nRows by year:")
print(
    df["year"]
    .value_counts()
    .sort_index()
)


# ------------------------------------------------------------
# Missing values
# ------------------------------------------------------------

print("\nMissing values:")
print(
    df.isna()
    .sum()
    .sort_values(ascending=False)
)


# ------------------------------------------------------------
# Station examples
# ------------------------------------------------------------

print("\nStation examples:")

print(
    df["station"]
    .dropna()
    .astype(str)
    .value_counts()
    .head(30)
)


# ------------------------------------------------------------
# Water level statistics
# ------------------------------------------------------------

print("\nWater level current statistics:")

print(
    pd.to_numeric(
        df["water_level_current"],
        errors="coerce"
    ).describe()
)


# ------------------------------------------------------------
# Save year summary
# ------------------------------------------------------------

summary = (
    df.groupby("year")
      .agg(
          rows=("year", "size"),
          valid_station=(
              "station",
              lambda x: x.notna().sum()
          ),
          valid_water_level=(
              "water_level_current",
              lambda x:
                  pd.to_numeric(
                      x,
                      errors="coerce"
                  ).notna().sum()
          )
      )
      .reset_index()
)


print("\nYEAR SUMMARY")
print(summary.to_string(index=False))


OUTPUT = ROOT / "outputs" / "year_data_summary.csv"

summary.to_csv(
    OUTPUT,
    index=False
)


print(
    f"\nSaved summary to:\n{OUTPUT}"
)