"""Causal, station-isolated features shared by training and observation inference.

Timestamps in source reports are interpreted in Asia/Colombo. Rows predict the
next recorded observation; no fixed target time can be inferred in production.
"""
import numpy as np
import pandas as pd

FEATURES = [
    'water_level_current', 'water_level_previous', 'water_level_lag_1',
    'water_level_lag_2', 'water_level_lag_3', 'rainfall_12hr', 'rainfall_lag_1',
    'rainfall_lag_2', 'rainfall_rolling_3', 'water_level_rolling_3',
    'hour_sin', 'hour_cos', 'month_sin', 'month_cos',
    'alert_level', 'minor_flood_level', 'major_flood_level',
]
MISSING_FEATURES = FEATURES + ['rainfall_missing', 'rainfall_lag_1_missing', 'rainfall_lag_2_missing']
THRESHOLDS = ['alert_level', 'minor_flood_level', 'major_flood_level']
RISK_LABELS = ['Low', 'Moderate', 'High', 'Very High']
# No alias merging: similar names do not establish identical gauges/datums.
# Basin assignments below are provisional, inferred from report station rows.
STATIONS = {
    'Hanwella': 'Kelani Ganga', 'Glencourse': 'Kelani Ganga',
    'Kithulgala': 'Kelani Ganga', 'Kitulgala': 'Kelani Ganga',
    "N' Street": 'Kelani Ganga', 'Nagalagam Street': 'Kelani Ganga',
    'Norwood': 'Kelani Ganga', 'Deraniyagala': 'Kelani Ganga',
    'Holombuwa': 'Kelani Ganga', 'Ellagawa': 'Kalu Ganga',
    'Putupaula': 'Kalu Ganga', 'Ratnapura': 'Kalu Ganga',
    'Rathnapura': 'Kalu Ganga', 'Magura': 'Kalu Ganga',
    'Kalawellawa (Millakanda)': 'Kalu Ganga',
}


def valid_thresholds(values):
    try:
        a, b, c = map(float, values)
        return bool(np.isfinite([a, b, c]).all() and 0 <= a < b < c)
    except (TypeError, ValueError):
        return False


def risk_label(value, thresholds):
    """Inclusive official report boundaries; no relative-rise fallback."""
    if not valid_thresholds(thresholds) or not np.isfinite(value):
        return 'Unknown'
    a, b, c = map(float, thresholds)
    return RISK_LABELS[int(value >= a) + int(value >= b) + int(value >= c)]


def restore_rainfall(clean, raw):
    """Recover missingness only through an unambiguous source-row match."""
    keys = ['source_file', 'source_page', 'station', 'date', 'time']
    raw = raw.copy()
    raw['rainfall_12hr'] = pd.to_numeric(raw.rainfall_12hr, errors='coerce')
    counts = raw.groupby(keys, dropna=False).size().rename('_matches')
    lookup = raw.drop_duplicates(keys).set_index(keys)[['rainfall_12hr']].join(counts)
    out = clean.drop(columns=['rainfall_12hr']).merge(
        lookup.reset_index(), on=keys, how='left', validate='many_to_one')
    out['rainfall_provenance_known'] = out['_matches'].eq(1)
    out.loc[~out.rainfall_provenance_known, 'rainfall_12hr'] = np.nan
    return out.drop(columns='_matches')


def build_features(observations, max_gap_hours=72):
    """Build targets BEFORE filtering history/feature rows. Never fills lags.

    Large gaps reset history. Duplicate station/timestamps are rejected rather
    than choosing an arbitrary conflicting reading. Invalid rows remain in the
    returned frame with exclusion reasons, preserving an audit trail.
    """
    d = observations.copy()
    if 'datetime' not in d:
        d['datetime'] = d['date'].astype(str) + ' ' + d['time'].astype(str)
    d['datetime'] = pd.to_datetime(d.datetime, errors='coerce')
    d['station'] = d.station.fillna('').astype(str).str.strip()
    for col in ['water_level_current', 'water_level_previous', 'rainfall_12hr'] + THRESHOLDS:
        d[col] = pd.to_numeric(d[col], errors='coerce').astype(float)
    d = d.sort_values(['station', 'datetime'], kind='stable').reset_index(drop=True)
    d['observation_time'] = d.datetime
    d['basin'] = d.station.map(STATIONS)
    d['exclusion_reason'] = ''

    def exclude(mask, reason):
        d.loc[mask, 'exclusion_reason'] += reason + ';'

    exclude(d.datetime.isna() | d.station.eq(''), 'invalid_identity_or_time')
    exclude(d.duplicated(['station', 'datetime'], keep=False), 'duplicate_station_time')
    exclude(d.basin.isna(), 'outside_project_coverage')
    exclude(~d.unit.isin(['m', 'ft']), 'unverified_or_shifted_unit')
    # Convert all reported level fields together. No conversions for unknown units.
    feet = d.unit.eq('ft')
    for col in ['water_level_current', 'water_level_previous'] + THRESHOLDS:
        d.loc[feet, col] *= .3048
    d['level_unit'] = 'm'
    exclude(~np.isfinite(d.water_level_current), 'invalid_level')
    exclude(~d[THRESHOLDS].apply(lambda r: valid_thresholds(r), axis=1), 'invalid_thresholds')
    exclude(d.rainfall_12hr.lt(0), 'negative_rainfall')
    # Invalid readings break history, so no model row spans an extraction anomaly.
    gap = d.groupby('station').datetime.diff().dt.total_seconds().div(3600)
    reset = gap.isna() | gap.le(0) | gap.gt(max_gap_hours) | d.exclusion_reason.ne('')
    reset |= d.groupby('station').exclusion_reason.shift().fillna('').ne('')
    d['_segment'] = reset.cumsum()
    g = d.groupby(['station', '_segment'], sort=False)
    d['target_time'] = g.datetime.shift(-1)
    d['target_water_level'] = g.water_level_current.shift(-1)
    d['horizon_hours'] = (d.target_time - d.datetime).dt.total_seconds() / 3600
    for n in [1, 2, 3]:
        d[f'water_level_lag_{n}'] = g.water_level_current.shift(n)
    d['rainfall_missing'] = d.rainfall_12hr.isna().astype(float)
    for n in [1, 2]:
        d[f'rainfall_lag_{n}'] = g.rainfall_12hr.shift(n)
        d[f'rainfall_lag_{n}_missing'] = g.rainfall_missing.shift(n)
    for source, dest in [('rainfall_12hr', 'rainfall_rolling_3'),
                         ('water_level_current', 'water_level_rolling_3')]:
        d[dest] = g[source].transform(lambda x: x.rolling(3, min_periods=3).mean())
    for name, values, period in [('hour', d.datetime.dt.hour, 24), ('month', d.datetime.dt.month, 12)]:
        d[name + '_sin'] = np.sin(2 * np.pi * values / period)
        d[name + '_cos'] = np.cos(2 * np.pi * values / period)
    d['history_valid'] = d[[f'water_level_lag_{n}' for n in [1, 2, 3]]].notna().all(axis=1)
    exclude(~d.history_valid, 'insufficient_history')
    return d.drop(columns='_segment')


def feature_matrix(frame, schema=FEATURES, allow_missing_rainfall=False):
    if list(schema) not in [FEATURES, MISSING_FEATURES]:
        raise ValueError('Unrecognized feature schema/order')
    missing = set(schema) - set(frame.columns)
    if missing:
        raise ValueError('Missing features: ' + ', '.join(sorted(missing)))
    x = frame[list(schema)].astype(float)
    required = [c for c in schema if not allow_missing_rainfall or not c.startswith('rainfall')]
    if not np.isfinite(x[required].to_numpy()).all() or np.isinf(x.to_numpy()).any():
        raise ValueError('Unavailable or non-finite required features; no arbitrary lag defaults')
    return x


def chronological_folds(frame, folds=3):
    """Timestamp groups stay together; training labels cannot reach validation."""
    times = np.sort(frame.observation_time.unique())
    if folds < 2 or len(times) < (folds + 1) * 2:
        raise ValueError('Need at least two folds and enough unique timestamps')
    chunks = np.array_split(times, folds + 1)
    for chunk in chunks[1:]:
        start, end = pd.Timestamp(chunk[0]), pd.Timestamp(chunk[-1])
        tr = np.flatnonzero(((frame.observation_time < start) & (frame.target_time < start)).to_numpy())
        va = np.flatnonzero(((frame.observation_time >= start) & (frame.observation_time <= end)
                            & (frame.target_time <= end)).to_numpy())
        if not len(tr) or not len(va):
            raise ValueError('Empty fold after target-time purge')
        yield tr, va
