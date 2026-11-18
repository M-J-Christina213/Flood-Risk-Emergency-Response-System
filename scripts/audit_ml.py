"""Read-only legacy reproduction and provenance audit. Never fits/overwrites models."""
import hashlib
import json
from pathlib import Path
import sys
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.ml_pipeline import FEATURES, THRESHOLDS, build_features, restore_rainfall


def main():
    out = ROOT / 'research/audit'
    out.mkdir(parents=True, exist_ok=True)
    raw = pd.read_csv(ROOT / 'outputs/water_levels_raw.csv')
    clean = pd.read_csv(ROOT / 'outputs/clean_water_levels.csv')
    legacy = pd.read_csv(ROOT / 'outputs/ml_features_fixed.csv', parse_dates=['datetime'])
    original = pd.read_csv(ROOT / 'outputs/ml_features.csv', parse_dates=['datetime'])
    test = legacy[legacy.datetime.ge('2025-01-01')].copy()
    missing = test[FEATURES].isna()
    test['exclusion_reason'] = missing.apply(lambda r: ';'.join(r.index[r]), axis=1)
    test.loc[test.exclusion_reason.ne('')].to_csv(out / 'legacy_test_exclusions.csv', index=False)
    valid = test[test.exclusion_reason.eq('')].copy()
    model = joblib.load(ROOT / 'outputs/ml/models/random_forest_fixed.pkl')
    model.n_jobs = 1
    assert list(model.feature_names_in_) == FEATURES
    pred = model.predict(valid[FEATURES])
    valid['prediction'] = pred
    valid['absolute_error'] = abs(valid.target_water_level - pred)
    # Recover target times from the actual input to fix_target.py, not from a re-shifted filtered table.
    original['legacy_target_time'] = original.groupby('station').datetime.shift(-1)
    original['legacy_next_value'] = original.groupby('station').water_level_current.shift(-1)
    keys = ['station', 'datetime', 'source_file', 'source_page', 'water_level_current']
    original['_occurrence'] = original.groupby(keys, dropna=False).cumcount()
    valid['_occurrence'] = valid.groupby(keys, dropna=False).cumcount()
    valid = valid.merge(original[keys + ['_occurrence', 'legacy_target_time', 'legacy_next_value']],
                        on=keys + ['_occurrence'], how='left', validate='one_to_one')
    valid['legacy_horizon_hours'] = (valid.legacy_target_time - valid.datetime).dt.total_seconds()/3600
    valid.sort_values('absolute_error', ascending=False).head(100).to_csv(out / 'largest_legacy_errors.csv', index=False)
    restored = restore_rainfall(clean, raw)
    corrected = build_features(restored)
    corrected.to_csv(out / 'corrected_features_all_rows.csv', index=False)
    corrected[corrected.exclusion_reason.ne('')].to_csv(out / 'corrected_exclusions.csv', index=False)
    clean[['station', 'river_basin', 'unit']].drop_duplicates().to_csv(out / 'station_unit_basin_inventory.csv', index=False)
    levels = clean.groupby('station')[THRESHOLDS].nunique(dropna=False)
    levels.to_csv(out / 'threshold_variants.csv')
    gaps = corrected.groupby('station').datetime.diff().dt.total_seconds()/3600
    corrected.loc[gaps.gt(72)].assign(gap_hours=gaps[gaps.gt(72)]).to_csv(out / 'long_gaps.csv', index=False)
    expected = corrected[['station', 'datetime', 'target_water_level', 'target_time']].rename(
        columns={'target_water_level': 'corrected_target'})
    expected = expected.drop_duplicates(['station','datetime'],keep=False)
    aligned = legacy.merge(expected, on=['station', 'datetime'], how='left', validate='many_to_one')
    mismatched = aligned.corrected_target.notna() & ~np.isclose(aligned.target_water_level, aligned.corrected_target)
    aligned.loc[mismatched].to_csv(out / 'target_disagreements.csv', index=False)
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in [ROOT/'outputs/app.db', *sorted((ROOT/'outputs/ml/models').glob('*.pkl'))]}
    summary = {
        'raw_rows': len(raw), 'clean_rows': len(clean), 'legacy_rows': len(legacy),
        'legacy_all_train_rows': int(legacy.datetime.lt('2025-01-01').sum()),
        'legacy_all_test_rows': len(test), 'legacy_evaluated_test_rows': len(valid),
        'exclusions_by_missing_fields': test.loc[test.exclusion_reason.ne(''), 'exclusion_reason'].value_counts().to_dict(),
        'actual_feature_count': len(FEATURES), 'features': FEATURES,
        'reported_29_feature_count_cause': 'Comprehensive script counts metadata columns; fitted model has 17 numeric inputs.',
        'legacy_rf': {'mae': mean_absolute_error(valid.target_water_level, pred),
                      'rmse': float(np.sqrt(mean_squared_error(valid.target_water_level, pred))),
                      'r2': r2_score(valid.target_water_level, pred), 'max_absolute_error': float(valid.absolute_error.max())},
        'legacy_horizon_hours': valid.legacy_horizon_hours.describe().to_dict(),
        'rainfall_missing_raw': int(raw.rainfall_12hr.isna().sum()),
        'restored_missing_rainfall_clean': int(restored.rainfall_12hr.isna().sum()),
        'unknown_rainfall_provenance': int((~restored.rainfall_provenance_known).sum()),
        'duplicate_station_times_clean': int(clean.duplicated(['station','datetime'], keep=False).sum()),
        'corrected_target_disagreements': int(mismatched.sum()),
        'corrected_eligible_history_rows': int(corrected.exclusion_reason.eq('').sum()),
        'artifacts_before': hashes,
        'limitations': ['No attached report, slides or notebooks found in workspace.',
                       'Station membership is provisional; aliases are kept separate.',
                       'Coordinate-valued unit fields show shifted extraction columns; not repairable by unit conversion.',
                       'Largest errors are retained. Source PDFs require manual gauge/datum verification.',
                       'Legacy test has already been inspected. No demonstrably unused later holdout established.',
                       'Hybrid source/CSV uses 2024 validation inverse-RMSE weights, but did not purge boundary targets.',
                       '84.46% accuracy uses test P60/P80/P95, not official station thresholds.'],
    }
    (out/'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary, indent=2), flush=True)


if __name__ == '__main__':
    main()
