"""Descriptive analysis of frozen predictions; never fits or selects models."""
import argparse
import json
from pathlib import Path
import sys
import numpy as np
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from app.ml_pipeline import RISK_LABELS


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run')
    args=parser.parse_args()
    path=Path(args.run).resolve()
    d=pd.read_csv(path/'holdout_predictions.csv',parse_dates=['observation_time','target_time'])
    # Documented descriptive event definition: any above-alert sequence, separated
    # by a below-alert observation or a >24h observation gap. No score-based exclusions.
    events=[]
    for station, rows in d.groupby('station'):
        rows=rows.sort_values('observation_time').copy()
        elevated=rows.actual_risk.ne('Low')
        reset=rows.observation_time.diff().gt(pd.Timedelta(hours=24)) | ~elevated | ~elevated.shift(fill_value=False)
        rows['event']=reset.cumsum()
        for ident,event in rows[elevated].groupby('event'):
            if len(event)<3:
                continue
            residual=event.predicted_water_level-event.target_water_level
            ranks={r:i for i,r in enumerate(RISK_LABELS)}
            events.append(dict(station=station,event=int(ident),start=str(event.observation_time.min()),
                end=str(event.target_time.max()),rows=len(event),rmse=float(np.sqrt((residual**2).mean())),
                mae=float(abs(residual).mean()),underpredicted_classes=int(sum(ranks[p]<ranks[a] for p,a in zip(event.predicted_risk,event.actual_risk)))))
    pd.DataFrame(events).to_csv(path/'event_metrics.csv',index=False)
    moderate=d[d.actual_risk.eq('Moderate') | d.predicted_risk.eq('Moderate')]
    summary={'definition':'Moderate confusion on frozen holdout, inclusive report thresholds, no threshold fitting',
        'rows_either_moderate':len(moderate),'wrong_class':int(moderate.actual_risk.ne(moderate.predicted_risk).sum()),
        'errors_within_0_25m_of_threshold':int((moderate.actual_risk.ne(moderate.predicted_risk) & moderate.nearest_threshold_distance.le(.25)).sum()),
        'all_rows_within_0_25m':int(d.nearest_threshold_distance.le(.25).sum()),
        'event_definition':'At/above alert, separated by below-alert or >24h gap, at least 3 test examples; descriptive, not independent flood-event validation',
        'events_with_sufficient_rows':len(events)}
    (path/'error_analysis.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
    print(json.dumps(summary,indent=2))


if __name__=='__main__':main()
