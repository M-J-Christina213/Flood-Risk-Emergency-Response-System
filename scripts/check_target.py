from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent

DATA_FILE = ROOT / "outputs" / "ml_features.csv"

df = pd.read_csv(DATA_FILE)

df["datetime"] = pd.to_datetime(df["datetime"])

df = df.sort_values(
    ["station", "datetime"]
).reset_index(drop=True)

print("=" * 70)
print("TARGET WATER LEVEL VERIFICATION")
print("=" * 70)

print("\nDataset shape:")
print(df.shape)

print("\nChecking first 30 observations for one station...")

station = df["station"].dropna().iloc[0]

sample = df[
    df["station"] == station
].head(30)[
    [
        "datetime",
        "station",
        "water_level_current",
        "target_water_level"
    ]
]

print("\nStation:")
print(station)

print("\n")
print(sample.to_string(index=False))


# ------------------------------------------------------------
# CHECK WHETHER TARGET IS NEXT OBSERVATION
# ------------------------------------------------------------

df["next_water_level"] = (
    df.groupby("station")["water_level_current"]
    .shift(-1)
)

df["target_difference"] = (
    df["target_water_level"]
    - df["next_water_level"]
)

valid = df["target_difference"].dropna()

print("\n" + "=" * 70)
print("TARGET COMPARISON")
print("=" * 70)

print("\nNumber of comparable rows:")
print(len(valid))

print("\nMaximum absolute difference:")
print(valid.abs().max())

print("\nMean absolute difference:")
print(valid.abs().mean())

print("\nNumber of exact matches:")
print((valid == 0).sum())

print("\nPercentage exact matches:")

if len(valid) > 0:
    print(
        round(
            (valid == 0).mean() * 100,
            2
        ),
        "%"
    )

print("\n" + "=" * 70)
print("INTERPRETATION")
print("=" * 70)

if len(valid) > 0 and valid.abs().max() == 0:

    print(
        "TARGET = NEXT WATER LEVEL OBSERVATION"
    )

    print(
        "This is appropriate for one-step-ahead forecasting."
    )

else:

    print(
        "TARGET DOES NOT EXACTLY MATCH NEXT OBSERVATION."
    )

    print(
        "Target construction needs to be inspected."
    )