import unittest
import numpy as np
import pandas as pd
from app.ml_pipeline import build_features, chronological_folds, risk_label, feature_matrix, restore_rainfall, FEATURES


def observations():
    return pd.DataFrame([
        dict(station=s, datetime=t, unit='m', water_level_current=v+i,
             water_level_previous=v+i-1, rainfall_12hr=1, alert_level=7,
             minor_flood_level=8, major_flood_level=10)
        for s, v in [('Hanwella', 1), ('Ellagawa', 20)]
        for i, t in enumerate(pd.date_range('2023-12-30', periods=72, freq='h'))
    ])


class CausalFeatures(unittest.TestCase):
    def test_station_isolation_and_target_alignment(self):
        d = build_features(observations().sample(frac=1, random_state=1))
        for _, rows in d.groupby('station'):
            self.assertTrue(np.allclose(rows.water_level_lag_1.iloc[1:], rows.water_level_current.iloc[:-1]))
            self.assertTrue(np.allclose(rows.target_water_level.iloc[:-1], rows.water_level_current.iloc[1:]))
            self.assertTrue(rows.horizon_hours.dropna().eq(1).all())
            self.assertTrue(pd.isna(rows.water_level_lag_1.iloc[0]))

    def test_future_readings_do_not_change_features(self):
        source = observations()
        first = build_features(source)
        source.loc[source.datetime.ge(pd.Timestamp('2024-01-01')), 'water_level_current'] = 999
        second = build_features(source)
        before = first.datetime.lt('2024-01-01')
        pd.testing.assert_frame_equal(first.loc[before, FEATURES], second.loc[before, FEATURES])

    def test_gap_and_duplicates_break_history(self):
        source = observations()
        source.loc[source.datetime.gt('2023-12-31'), 'datetime'] += pd.Timedelta(days=10)
        d = build_features(source)
        self.assertGreater(d.exclusion_reason.str.contains('insufficient_history').sum(), 6)
        dup = build_features(pd.concat([observations(), observations().iloc[[4]]]))
        self.assertEqual(dup.exclusion_reason.str.contains('duplicate_station_time').sum(), 2)

    def test_purged_timestamp_splits(self):
        d = build_features(observations())
        d = d[d.exclusion_reason.eq('') & d.target_time.notna()].reset_index(drop=True)
        for tr, va in chronological_folds(d, 3):
            self.assertLess(d.iloc[tr].target_time.max(), d.iloc[va].observation_time.min())
            self.assertFalse(set(d.iloc[tr].observation_time) & set(d.iloc[va].observation_time))
            self.assertTrue(d.iloc[va].groupby('observation_time').size().eq(2).all())

    def test_boundaries_and_invalid_thresholds(self):
        self.assertEqual([risk_label(x, [7,8,10]) for x in [6.999,7,8,10]],
                         ['Low','Moderate','High','Very High'])
        for thresholds in [[8,7,10], [7,7,10], [7,np.nan,10], [-1,2,3]]:
            self.assertEqual(risk_label(12, thresholds), 'Unknown')

    def test_missing_history_and_schema_fail_closed(self):
        d = build_features(observations())
        with self.assertRaises(ValueError):
            feature_matrix(d.iloc[[0]])
        with self.assertRaises(ValueError):
            feature_matrix(d, list(reversed(FEATURES)))

    def test_units_converted_together(self):
        source = observations().iloc[:5].copy()
        source['unit'] = 'ft'
        d = build_features(source)
        self.assertAlmostEqual(d.alert_level.iloc[0], 7*.3048)
        self.assertAlmostEqual(d.water_level_current.iloc[0], .3048)

    def test_rainfall_provenance_keeps_missing_separate_from_zero(self):
        clean = pd.DataFrame([dict(source_file='report.pdf',source_page=1,station='Hanwella',
            date='2023-01-01',time='00:00',rainfall_12hr=0)])
        raw = clean.copy();raw['rainfall_12hr'] = np.nan
        restored = restore_rainfall(clean,raw)
        self.assertTrue(restored.rainfall_provenance_known.iloc[0])
        self.assertTrue(pd.isna(restored.rainfall_12hr.iloc[0]))
        raw['rainfall_12hr'] = 0
        self.assertEqual(restore_rainfall(clean,raw).rainfall_12hr.iloc[0],0)


if __name__ == '__main__':
    unittest.main()
