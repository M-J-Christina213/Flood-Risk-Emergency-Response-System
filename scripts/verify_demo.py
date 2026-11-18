"""Verify the demo using a disposable SQLite backup; never mutate outputs/app.db.
Run from repository root: python scripts/verify_demo.py
Requires the application dependencies plus httpx for FastAPI TestClient.
"""
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    source = ROOT / 'outputs/app.db'
    original = digest(source)
    model_hashes = {p.name: digest(p) for p in (ROOT / 'outputs/ml/models').glob('*.pkl')}
    with tempfile.TemporaryDirectory(prefix='flood-demo-') as directory:
        copy = Path(directory) / 'test.db'
        with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as db:
            counts = {t: db.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
                      for t in ['reports', 'prediction_logs', 'alerts']}
            with closing(sqlite3.connect(copy)) as dest:
                db.backup(dest)
        os.environ['FLOOD_DB_PATH'] = str(copy)
        from fastapi.testclient import TestClient
        from app.main import app, df, FEATURES, model_rf, calculate_risk
        from app.database import engine
        from app.database import SessionLocal
        from app.models import User
        from app.auth import password_hash
        import secrets
        import numpy as np
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, recall_score

        client = TestClient(app)
        password = secrets.token_urlsafe(24)
        with SessionLocal() as db:
            db.add(User(username='demo_verifier_admin', role='admin', password_hash=password_hash(password)))
            db.add(User(username='demo_verifier_coordinator', role='coordinator', password_hash=password_hash(password)))
            db.commit()
        token = client.post('/auth/login', json={'username':'demo_verifier_admin', 'password':password}).json()['access_token']
        client.headers['Authorization'] = 'Bearer ' + token
        checks = []
        def check(name, condition):
            assert condition, name
            checks.append(name)
            print('PASS', name, flush=True)

        health = client.get('/health').json()
        check('health', health['status'] == 'healthy' and health['stations'] == 55)
        stations = client.get('/stations').json()['stations']
        errors = []
        for station in stations:
            try:
                response = client.get('/station/' + station)
                if response.status_code != 200 or not np.isfinite(response.json()['predicted_water_level']):
                    errors.append([station, response.status_code, response.text[:200]])
            except Exception as exc:
                errors.append([station, str(exc)])
        print('station_errors', errors, flush=True)
        check('all station predictions return finite JSON', not errors)
        check('unknown station 404', client.get('/station/not-a-station').status_code == 404)
        prediction = client.get('/predict/Hanwella').json()
        with closing(sqlite3.connect(copy)) as db:
            check('prediction log persisted', db.execute('SELECT COUNT(*) FROM prediction_logs').fetchone()[0] == counts['prediction_logs'] + 1)
        report = client.post('/reports', json={'latitude': 6.9069, 'longitude': 80.1347, 'report_type': 'road', 'severity': 'moderate', 'description': 'SUPERVISOR DEMO TEST - disposable database'}).json()['report']
        report_id = report['id']
        check('report created', report['status'] == 'new')
        check('invalid coordinate 422', client.post('/reports', json={'latitude': 91, 'longitude': 80, 'report_type': 'road'}).status_code == 422)
        check('invalid transition 409', client.patch(f'/reports/{report_id}/status', json={'status': 'resolved'}).status_code == 409)
        for status in ['verified', 'dispatched', 'resolved']:
            if status == 'dispatched':
                assignment = client.patch(f'/coordination/reports/{report_id}', json={'status':'assigned','coordinator':'demo_verifier_coordinator'})
                check('coordinator assigned before progress', assignment.status_code == 200)
            check('report ' + status, client.patch(f'/reports/{report_id}/status', json={'status': status}).json()['report']['status'] == status)
        check('idempotent status retry', client.patch(f'/reports/{report_id}/status', json={'status': 'resolved'}).status_code == 200)
        check('unknown report 404', client.patch('/reports/missing/status', json={'status': 'verified'}).status_code == 404)
        check('invalid status 422', client.patch(f'/reports/{report_id}/status', json={'status': 'invented'}).status_code == 422)
        payload = {'title': 'SUPERVISOR DEMO', 'message': 'Test warning in disposable DB', 'severity': 'High', 'station': 'Hanwella'}
        first = client.post('/alerts', json=payload).json()['alert']
        second = client.post('/alerts', json=payload).json()['alert']
        check('rapid alert IDs unique', first['id'] != second['id'])
        check('alert revoked', client.patch(f"/alerts/{first['id']}/revoke").status_code == 200)
        check('unknown alert 404', client.patch('/alerts/missing/revoke').status_code == 404)
        check('nearby explicitly placeholder', 'coordinates' in client.post('/nearby', json={'latitude': 6.9, 'longitude': 80}).json()['message'])
        client.close()
        engine.dispose()
        client = TestClient(app)
        client.headers['Authorization'] = 'Bearer ' + token
        restored = {r['id']: r for r in client.get('/reports').json()['reports']}
        alerts = {a['id']: a for a in client.get('/alerts').json()['alerts']}
        check('status survives new client and DB connection', restored[report_id]['status'] == 'resolved')
        check('revocation survives new client and DB connection', alerts[first['id']]['status'] == 'Revoked')
        with closing(sqlite3.connect(copy)) as db:
            check('existing records retained', db.execute('SELECT COUNT(*) FROM reports').fetchone()[0] == counts['reports'] + 1 and db.execute('SELECT COUNT(*) FROM alerts').fetchone()[0] == counts['alerts'] + 2)
        # Match the existing training script's feature filtering and chronological split.
        test = df[FEATURES + ['target_water_level', 'datetime']].dropna()
        test = test[test.datetime >= '2025-01-01']
        predicted = model_rf.predict(test[FEATURES])
        actual = test.target_water_level.to_numpy()
        metrics = {'test_rows': len(test), 'MAE': mean_absolute_error(actual, predicted), 'RMSE': float(np.sqrt(mean_squared_error(actual, predicted))), 'R2': r2_score(actual, predicted)}
        labels = ['Low', 'Moderate', 'High', 'Very High']
        def risks(levels):
            return [calculate_risk(level, row.water_level_current, row.alert_level, row.minor_flood_level, row.major_flood_level) for level, row in zip(levels, test.itertuples())]
        truth, forecast = risks(actual), risks(predicted)
        metrics['risk_accuracy'] = accuracy_score(truth, forecast)
        metrics['risk_recall'] = dict(zip(labels, recall_score(truth, forecast, labels=labels, average=None, zero_division=0).tolist()))
        saved = ROOT / 'outputs/ml/model_predictions_fixed.csv'
        import pandas as pd
        prior = pd.read_csv(saved)
        metrics['saved_prediction_rows'] = len(prior)
        metrics['saved_columns'] = list(prior.columns)
        metrics['risk_mapping'] = 'Strict report thresholds, inclusive boundaries; no relative-rise fallback. Different rule from supervisor baseline; not model improvement.'
        print('VERIFIED_METRICS', json.dumps(metrics), flush=True)
        client.close()
        engine.dispose()
    check('original database byte-for-byte unchanged', digest(source) == original)
    check('all saved model files unchanged', all(digest(ROOT / 'outputs/ml/models' / name) == h for name, h in model_hashes.items()))
    result = {'checks_passed': len(checks), 'checks': checks, 'original_database_sha256': original, 'original_counts': counts, 'health': health, 'hanwella_prediction': prediction, 'metrics': metrics, 'model_sha256': model_hashes}
    output = ROOT / '.demo/verification.json'
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print('SUCCESS', len(checks), 'checks; evidence:', output, flush=True)


if __name__ == '__main__':
    main()
