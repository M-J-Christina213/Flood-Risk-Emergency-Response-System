"""Bounded, chronological experiments. Writes a NEW run; never activates models."""
import argparse
import hashlib
import importlib.metadata
import json
import platform
from pathlib import Path
import sys
import time
from datetime import datetime, timezone
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor, GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import ParameterSampler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, classification_report, confusion_matrix

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.ml_pipeline import (MISSING_FEATURES, THRESHOLDS, RISK_LABELS,
                             build_features, restore_rainfall, chronological_folds, risk_label)


def metrics(rows, predictions):
    actual = rows.target_water_level.to_numpy()
    a = np.array([risk_label(v, t) for v, t in zip(actual, rows[THRESHOLDS].to_numpy())])
    p = np.array([risk_label(v, t) for v, t in zip(predictions, rows[THRESHOLDS].to_numpy())])
    severe = np.isin(a, ['High', 'Very High'])
    ranks = {name: i for i, name in enumerate(RISK_LABELS)}
    under = np.array([ranks[y] < ranks[x] for x, y in zip(a, p)])
    report = classification_report(a, p, labels=RISK_LABELS, output_dict=True, zero_division=0)
    return {'rows': len(rows), 'rmse': float(np.sqrt(mean_squared_error(actual, predictions))),
            'mae': mean_absolute_error(actual, predictions), 'r2': r2_score(actual, predictions),
            'macro_f1': report['macro avg']['f1-score'], 'per_class': report,
            'confusion_matrix': confusion_matrix(a, p, labels=RISK_LABELS).tolist(),
            'severe_support': int(severe.sum()), 'severe_underpredicted': int((severe & under).sum()),
            'severe_underprediction_rate': float(under[severe].mean()) if severe.any() else None}


def export_predictions(rows, pred, path):
    out = rows[['station', 'basin', 'observation_time', 'target_time', 'horizon_hours',
                'water_level_current', 'target_water_level'] + THRESHOLDS].copy()
    out['predicted_water_level'] = pred
    out['actual_risk'] = [risk_label(v, t) for v,t in zip(out.target_water_level, out[THRESHOLDS].to_numpy())]
    out['predicted_risk'] = [risk_label(v, t) for v,t in zip(pred, out[THRESHOLDS].to_numpy())]
    out['nearest_threshold_distance'] = np.min(abs(out[THRESHOLDS].to_numpy()-out.target_water_level.to_numpy()[:,None]),axis=1)
    out.to_csv(path, index=False)
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidates', type=int, default=2)
    parser.add_argument('--folds', type=int, default=3)
    parser.add_argument('--jobs', type=int, default=2)
    parser.add_argument('--trees', type=int, default=80)
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--max-gap-hours', type=float, default=72)
    parser.add_argument('--boosting', action='store_true')
    parser.add_argument('--validation-only', action='store_true', help='Export validation comparisons without inspecting historical holdout')
    parser.add_argument('--run-id', default=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    args = parser.parse_args()
    if args.candidates < 1 or args.folds < 2 or args.jobs < 1 or args.trees < 1 or args.max_gap_hours <= 0:
        parser.error('Positive budgets, at least two folds, and positive gap required')
    if Path(args.run_id).name != args.run_id or args.run_id in ['.', '..']:
        parser.error('run-id must be a simple directory name')
    out = ROOT/'research/runs'/args.run_id
    out.mkdir(parents=True, exist_ok=False)
    started = time.perf_counter()
    clean_path, raw_path = ROOT/'outputs/clean_water_levels.csv', ROOT/'outputs/water_levels_raw.csv'
    d = build_features(restore_rainfall(pd.read_csv(clean_path), pd.read_csv(raw_path)), args.max_gap_hours)
    d.loc[d.target_time.isna(), 'exclusion_reason'] += 'no_next_observation_in_valid_segment;'
    # All learned rainfall imputation is inside each model pipeline/fold.
    eligible = d.exclusion_reason.eq('') & d.target_time.notna()
    d.loc[~eligible].to_csv(out/'excluded_rows.csv', index=False)
    d = d[eligible].reset_index(drop=True)
    cutoff = pd.Timestamp('2025-01-01')
    train = d[(d.observation_time < cutoff) & (d.target_time < cutoff)].reset_index(drop=True)
    test = d[d.observation_time >= cutoff].reset_index(drop=True)
    if train.empty or test.empty:
        raise ValueError('Insufficient eligible train/holdout rows')
    manifest = d[['station','observation_time','target_time']].copy()
    manifest['split'] = np.where(d.observation_time >= cutoff, 'previously_inspected_test',
                                 np.where(d.target_time < cutoff, 'train', 'purged_boundary'))
    manifest.to_csv(out/'split_manifest.csv', index=False)
    x, y = train[MISSING_FEATURES], train.target_water_level
    folds = list(chronological_folds(train, args.folds))
    fold_rows = []
    for i, (tr, va) in enumerate(folds):
        for role, idx in [('train',tr),('validation',va)]:
            fold_rows.extend({'fold': i, 'role': role, 'station': train.iloc[n].station,
                              'observation_time': train.iloc[n].observation_time,
                              'target_time': train.iloc[n].target_time} for n in idx)
    pd.DataFrame(fold_rows).to_csv(out/'fold_manifest.csv',index=False)
    fingerprint = hashlib.sha256(clean_path.read_bytes()+raw_path.read_bytes()).hexdigest()
    config = vars(args) | {'dataset_sha256':fingerprint, 'features':MISSING_FEATURES,
        'test_policy':'Historical cutoff retained; previously inspected. No prospective claim.',
        'selection_rule':'Lowest mean fold RMSE; require improvement over persistence in every fold for promotion consideration. No automatic activation.',
        'rainfall_strategies':['training-fold median plus source missingness','constant zero plus source missingness'],
        'units':'levels m (known ft converted); reported rainfall assumed mm, requires source verification',
        'gap_policy':'72h default engineering exclusion, configurable; not a scientifically established horizon',
        'dependencies':{p:importlib.metadata.version(p) for p in ['numpy','pandas','scikit-learn','joblib','xgboost']},
        'environment':{'python':sys.version,'platform':platform.platform(),'processor':platform.processor()}}
    (out/'config.json').write_text(json.dumps(config,indent=2),encoding='utf-8')
    records, candidates, oof = [], {}, {}
    persistence_folds = []
    for i, (_, va) in enumerate(folds):
        m = metrics(train.iloc[va],train.iloc[va].water_level_current.to_numpy())
        persistence_folds.append(m['rmse'])
        records.append({'candidate':'persistence','fold':i,**{k:v for k,v in m.items() if k in ['rmse','mae','r2','macro_f1','severe_underprediction_rate']}})
    factories = {'rf':RandomForestRegressor,'extra_trees':ExtraTreesRegressor}
    if args.boosting:
        from xgboost import XGBRegressor
        factories.update({'gradient_boosting':GradientBoostingRegressor,'xgboost':XGBRegressor})
    for name, factory in factories.items():
        params = {'max_depth':[6,12,20], 'min_samples_leaf':[1,3,8], 'max_features':[.7,1.]}
        if name in ['gradient_boosting','xgboost']:
            params = {'max_depth':[2,3,5], 'learning_rate':[.03,.06,.1]}
        for n, sampled in enumerate(ParameterSampler(params,n_iter=args.candidates,random_state=args.seed)):
            for strategy in ['median','constant']:
                ident = f'{name}_{n}_{strategy}'
                options = dict(sampled,n_estimators=args.trees,random_state=args.seed)
                if name != 'gradient_boosting':
                    options['n_jobs'] = args.jobs
                pipe = Pipeline([('imputer',SimpleImputer(strategy=strategy,fill_value=0,keep_empty_features=True)),
                                 ('model',factory(**options))])
                candidates[ident] = pipe
                oof[ident] = np.full(len(train),np.nan)
                for i,(tr,va) in enumerate(folds):
                    pipe.fit(x.iloc[tr],y.iloc[tr])
                    pred = pipe.predict(x.iloc[va])
                    oof[ident][va] = pred
                    m = metrics(train.iloc[va], pred)
                    records.append({'candidate':ident,'fold':i,'parameters':json.dumps(options),
                                    **{k:v for k,v in m.items() if k in ['rmse','mae','r2','macro_f1','severe_underprediction_rate']}})
                print('validated',ident,flush=True)
    search = pd.DataFrame(records)
    search.to_csv(out/'search_results.csv',index=False)
    comparison = search.groupby('candidate')[['rmse','mae','r2','macro_f1','severe_underprediction_rate']].mean().sort_values('rmse')
    comparison.to_csv(out/'validation_comparison.csv')
    for ident, values in oof.items():
        keep = np.isfinite(values)
        export_predictions(train[keep], values[keep], out/f'validation_{ident}.csv')
    chosen = comparison.drop(index='persistence').index[0]
    scores = search[search.candidate.eq(chosen)].sort_values('fold').rmse.to_numpy()
    reliable = bool(np.all(scores < np.array(persistence_folds)))
    # Validation-only hybrid weights; no held-out predictions used for fitting.
    hybrid_info = None
    if args.boosting:
        rf_id = comparison.loc[comparison.index.str.startswith('rf_')].index[0]
        gb_id = comparison.loc[comparison.index.str.startswith('gradient_boosting_')].index[0]
        inv = 1 / comparison.loc[[rf_id, gb_id], 'rmse'].to_numpy()
        weights = inv/inv.sum()
        hybrid_info = {'rf':rf_id,'gb':gb_id,'weights':weights.tolist(),'method':'inverse mean purged-validation RMSE'}
        hybrid_pred = weights[0]*oof[rf_id]+weights[1]*oof[gb_id]
        has = np.isfinite(hybrid_pred)
        hybrid_info['validation'] = metrics(train[has], hybrid_pred[has])
        hybrid_info['fold_rmse'] = [float(np.sqrt(mean_squared_error(y.iloc[va], hybrid_pred[va]))) for _, va in folds]
        hybrid_info['mean_fold_rmse'] = float(np.mean(hybrid_info['fold_rmse']))
        export_predictions(train[has], hybrid_pred[has], out/'validation_hybrid.csv')
    if args.validation_only:
        summary = dict(candidate=chosen, validation=comparison.loc[chosen].to_dict(),
                       beats_persistence_all_folds=reliable, hybrid=hybrid_info, holdout_inspected=False)
        (out/'validation_summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
        print(json.dumps(summary),flush=True)
        return
    selected = candidates[chosen]
    selected.fit(x,y)
    # Holdout inspected only AFTER candidate/config selection is frozen above.
    test_pred = selected.predict(test[MISSING_FEATURES])
    final_metrics = metrics(test,test_pred)
    persistence = metrics(test,test.water_level_current.to_numpy())
    final_metrics['persistence_rmse_improvement'] = persistence['rmse']-final_metrics['rmse']
    predictions = export_predictions(test,test_pred,out/'holdout_predictions.csv')
    has = np.isfinite(oof[chosen])
    export_predictions(train[has],oof[chosen][has],out/'validation_predictions.csv')
    breakdown = []
    for by in ['station','basin']:
        for value, rows in test.groupby(by):
            m = metrics(rows,test_pred[rows.index])
            breakdown.append({'group':by,'value':value,**m})
    # Events: station sequences at/above alert separated by >24h; descriptive only.
    predictions['event_id'] = predictions.groupby('station').observation_time.diff().gt(pd.Timedelta(hours=24)).cumsum()
    event_rows = predictions[predictions.actual_risk.isin(['Moderate','High','Very High'])]
    event_rows.to_csv(out/'flood_event_rows.csv',index=False)
    predictions[predictions.actual_risk.eq('Moderate') | predictions.predicted_risk.eq('Moderate')].to_csv(out/'moderate_confusion.csv',index=False)
    predictions.assign(absolute_error=abs(test.target_water_level.to_numpy()-test_pred)).sort_values('absolute_error',ascending=False).head(100).to_csv(out/'largest_errors.csv',index=False)
    metadata = config | {'candidate':chosen,'validation':comparison.loc[chosen].to_dict(),
        'beats_persistence_all_folds':reliable,'holdout':final_metrics,'persistence_holdout':persistence,
        'hybrid':hybrid_info,'breakdown':breakdown,'train_rows':len(train),'holdout_rows':len(test),
        'training_period':[str(train.observation_time.min()),str(train.target_time.max())],
        'forecast_horizon':'next recorded observation; variable; production target time unknown',
        'feature_types':{f:'float64' for f in MISSING_FEATURES},
        'elapsed_seconds':time.perf_counter()-started,'activation':'NOT ACTIVATED; original RF preserved'}
    joblib.dump({'pipeline':selected,'metadata':metadata},out/'model_bundle.joblib')
    (out/'metrics.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig,ax=plt.subplots(); ax.hist(test_pred-test.target_water_level,bins=40); ax.set(xlabel='Predicted minus actual (m)',ylabel='Rows'); fig.savefig(out/'residuals.png'); plt.close(fig)
    fig,ax=plt.subplots(); ax.imshow(final_metrics['confusion_matrix']); ax.set(xticks=range(4),yticks=range(4),xticklabels=RISK_LABELS,yticklabels=RISK_LABELS,xlabel='Predicted',ylabel='Actual'); fig.tight_layout(); fig.savefig(out/'confusion_matrix.png'); plt.close(fig)
    station = predictions.loc[predictions.target_water_level.idxmax(),'station']
    example = predictions[predictions.station.eq(station)].sort_values('target_time').tail(80)
    fig,ax=plt.subplots(); ax.plot(example.target_time,example.target_water_level,label='Actual'); ax.plot(example.target_time,example.predicted_water_level,label='Forecast'); ax.legend(); ax.set(title=f'{station}: representative recorded sequence',ylabel='Level (m)'); fig.autofmt_xdate(); fig.savefig(out/'event.png'); plt.close(fig)
    (out/'MODEL_CARD.md').write_text(
        f'# Research candidate {args.run_id}\n\nCandidate: {chosen}. Not active.\n\n'
        f'Validation mean RMSE: {comparison.loc[chosen,"rmse"]:.6f} m. '
        f'Previously inspected historical holdout RMSE: {final_metrics["rmse"]:.6f} m. '
        f'Persistence: {persistence["rmse"]:.6f} m.\n\n'
        'Coverage: provisional Kelani/Kalu station mapping, aliases separate. Known ft converted to m. '
        'Shifted units, invalid thresholds, duplicate times and insufficient/gapped history excluded with manifests. '
        'Rainfall provenance restored from raw source rows; imputer learned on each training fold. '
        'Reported previous-level timing and rainfall units still need source review. '
        'Next-observation target, not a fixed-hour warning. Target time is unknown for new observations. '
        'Historical test has been inspected before; no prospective performance claim. '
        'Thresholds are report-derived and not independently certified. No inundation mapping or official warnings. '
        'No model activation: changed coverage/preprocessing precludes direct improvement claims against legacy RF. '
        'Ordinal classifier deferred pending station/threshold validation and sufficient severe events.\n',encoding='utf-8')
    print(json.dumps({'run':str(out),'candidate':chosen,'validation_rmse':comparison.loc[chosen,'rmse'],
                      'holdout_rmse':final_metrics['rmse'],'persistence_rmse':persistence['rmse'],
                      'reliable_against_persistence':reliable}),flush=True)


if __name__ == '__main__':
    main()
