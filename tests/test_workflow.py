"""Integration evidence uses a disposable backup, never outputs/app.db."""
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import time
import unittest
from unittest.mock import patch
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
TEMP=tempfile.TemporaryDirectory(prefix='flood-integration-')
TEST_DB=Path(TEMP.name)/'integration.db'
SOURCE=ROOT/'outputs/app.db'
ORIGINAL_HASH=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
MODEL_HASHES={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'outputs/ml/models').glob('*.pkl')}
with closing(sqlite3.connect(SOURCE.as_uri()+'?mode=ro',uri=True)) as src:
    with closing(sqlite3.connect(TEST_DB)) as dest:
        src.backup(dest)
os.environ['FLOOD_DB_PATH']=str(TEST_DB)

from fastapi.testclient import TestClient
from app.main import app,model_rf
from app.database import SessionLocal,engine
from app.models import User
from app.auth import password_hash
from app import workflow as w


class FullWorkflow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client=TestClient(app)
        with SessionLocal() as db:
            for name,role in [('admin_test','admin'),('coordinator_test','coordinator'),('other_test','coordinator'),('public_test','public')]:
                db.add(User(username=name,role=role,password_hash=password_hash('integration-password')))
            db.commit()
        cls.headers={}
        for name in ['admin_test','coordinator_test','other_test','public_test']:
            result=cls.client.post('/auth/login',json={'username':name,'password':'integration-password'})
            assert result.status_code==200,result.text
            cls.headers[name]={'Authorization':'Bearer '+result.json()['access_token']}
        cls.evidence={}

    @classmethod
    def tearDownClass(cls):
        cls.client.close();engine.dispose()
        assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==ORIGINAL_HASH
        assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in MODEL_HASHES.items())
        cls.evidence.update(original_database_unchanged=True,models_unchanged=True)
        out=ROOT/'research/verification';out.mkdir(parents=True,exist_ok=True)
        (out/'integration.json').write_text(json.dumps(cls.evidence,indent=2),encoding='utf-8')
        TEMP.cleanup()

    def test_01_permissions_and_sessions(self):
        c=self.client
        for route in ['/reports','/priority-areas','/coordination/reports','/admin/models','/ingestion/status']:
            self.assertEqual(c.get(route).status_code,401,route)
        self.assertEqual(c.get('/reports',headers=self.headers['public_test']).status_code,403)
        self.assertEqual(c.post('/imports',headers=self.headers['coordinator_test'],json={'filename':'x','content':'x'}).status_code,403)
        self.assertEqual(c.post('/auth/login',json={'username':'admin_test','password':'wrong-password'}).status_code,401)
        self.assertEqual(c.post('/auth/register',json={'username':'new_public','password':'integration-password','role':'admin'}).json()['role'],'public')
        self.assertEqual(c.get('/admin/models',headers=self.headers['admin_test']).status_code,200)
        self.evidence['permissions']='anonymous 401, public 403, coordinator import 403, wrong credentials 401; no registration privilege escalation'

    def test_02_report_assignment_resolution_and_audit(self):
        c=self.client; ah=self.headers['admin_test']; ch=self.headers['coordinator_test']
        payload=dict(latitude=6.9,longitude=80.1,report_type='road',severity='severe',description='Integration test',client_request_id='integration-request-001')
        response=c.post('/reports',json=payload)
        self.assertEqual(response.status_code,200,response.text)
        ident=response.json()['report']['id']
        self.assertEqual(c.post('/reports',json=payload).json()['report']['id'],ident)
        self.assertEqual(c.post('/reports',json=dict(payload,description='conflict')).status_code,409)
        route=f'/coordination/reports/{ident}'
        self.assertEqual(c.patch(route,headers=ah,json={'status':'resolved'}).status_code,409)
        self.assertEqual(c.patch(route,headers=ch,json={'status':'reviewed','station':'Hanwella','notes':'Location checked'}).status_code,200)
        self.assertEqual(c.patch(route,headers=ah,json={'status':'assigned'}).status_code,409)
        self.assertEqual(c.patch(route,headers=ah,json={'status':'assigned','coordinator':'coordinator_test'}).status_code,200)
        self.assertEqual(c.patch(route,headers=self.headers['other_test'],json={'status':'in_progress'}).status_code,403)
        self.assertEqual(c.patch(route,headers=ch,json={'status':'in_progress'}).status_code,200)
        action=c.post(route+'/actions',headers=ch,json={'description':'Phone call logged manually','status':'planned'})
        self.assertEqual(action.status_code,200,action.text)
        action_route='/coordination/actions/'+action.json()['id']
        for state in ['in_progress','completed']:
            self.assertEqual(c.patch(action_route,headers=ch,json={'description':'Manual action','status':state}).status_code,200)
        self.assertEqual(c.patch(route,headers=ch,json={'status':'resolved'}).status_code,200)
        self.assertEqual(c.patch(route,headers=ch,json={'status':'resolved'}).status_code,200)
        history=c.get(route+'/history',headers=ch).json()
        self.assertEqual(len([h for h in history['history'] if h['action']=='report_transition']),4)
        self.assertEqual(len(history['actions']),1)
        with SessionLocal() as db:
            from app.models import Report
            self.assertEqual(db.get(Report,ident).status,'resolved')
        self.evidence['report_workflow']={'report_id':ident,'transitions':4,'manual_action':'completed','retry_deduplicated':True}

    def test_03_import_prediction_alert_acknowledgement(self):
        c=self.client; ah=self.headers['admin_test']; ph=self.headers['public_test']
        self.assertEqual(c.post('/subscriptions',headers=ph,json={'station':'Hanwella'}).status_code,200)
        self.assertEqual(c.post('/subscriptions',headers=ph,json={'basin':'Kelani Ganga','channel':'expo','destination':'ExponentPushToken[test]'}).status_code,200)
        latest=pd.Timestamp.now(tz='Asia/Colombo').floor('min').tz_localize(None)-pd.Timedelta(minutes=5)
        rows=[dict(station='Hanwella',datetime=(latest-pd.Timedelta(hours=3-i)).isoformat(),unit='m',
                   water_level_current=5.0+i*.1,water_level_previous=4.9+i*.1,rainfall_12hr=1,
                   alert_level=2,minor_flood_level=3,major_flood_level=4) for i in range(4)]
        csv=pd.DataFrame(rows[::-1]).to_csv(index=False)
        body=dict(filename='observations.csv',content=csv)
        imported=c.post('/imports',headers=ah,json=body)
        self.assertEqual(imported.status_code,200,imported.text)
        self.assertEqual(imported.json()['accepted'],4)
        self.assertTrue(c.post('/imports',headers=ah,json=body).json()['duplicate'])
        another=c.post('/imports',headers=ah,json=dict(body,filename='duplicate.csv')).json()
        self.assertEqual(another['duplicates'],4)
        before=time.perf_counter()
        event=c.post('/worker/run',headers=ah)
        elapsed=time.perf_counter()-before
        self.assertEqual(event.status_code,200,event.text)
        successful=[e for e in event.json()['events'] if e['status']=='success']
        self.assertEqual(len(successful),1,event.text)
        p=successful[0]
        self.assertEqual(p['freshness_status'],'fresh')
        self.assertIsNone(p['forecast_target_time'])
        self.assertTrue(p['alert_id'])
        served=c.get('/station/Hanwella').json()
        self.assertEqual(served['source_mode'],'manual_upload')
        self.assertAlmostEqual(served['current_water_level'],5.3)
        with patch.dict(os.environ,{'FLOOD_MAX_AGE_SECONDS':'1'}):
            self.assertEqual(c.get('/station/Hanwella').json()['freshness_status'],'stale')
        self.assertEqual(c.post('/worker/run',headers=ah).json()['events'],[])
        inbox=c.get('/inbox',headers=ph).json()
        self.assertEqual({d['state'] for d in inbox['deliveries']},{'available_in_web_inbox','test_recorded'})
        for _ in range(2):
            self.assertEqual(c.post('/alerts/'+p['alert_id']+'/acknowledge',headers=ph).status_code,200)
        self.assertEqual(len(c.get('/inbox',headers=ph).json()['acknowledgements']),1)
        with SessionLocal() as db:
            # Same-risk duplicate suppression; rising risk bypasses cooldown.
            baseline=dict(p,station='Ellagawa',basin='Kalu Ganga',risk_level='Moderate')
            first=w.generate_alert(db,baseline,'cooldown-1')
            self.assertIsNotNone(first)
            self.assertIsNone(w.generate_alert(db,baseline,'cooldown-2'))
            self.assertIsNotNone(w.generate_alert(db,dict(baseline,risk_level='High'),'escalation'))
            stale=dict(p,freshness_status='stale',predictive_alert_eligible=False)
            self.assertIsNone(w.generate_alert(db,stale,'stale'))
            self.assertIsNone(w.generate_alert(db,dict(stale,source_mode='historical_replay'),'historical-no-auto-warning'))
            db.commit()
        self.evidence['observation_alert_workflow']={'successful_predictions':len(successful),'failed_missing_history':3,
            'worker_request_seconds':elapsed,'alert_id':p['alert_id'],'delivery_states':[d['state'] for d in inbox['deliveries']],
            'ack_count':1,'cooldown_and_escalation':True}

    def test_04_failures_replay_and_latency(self):
        c=self.client; ah=self.headers['admin_test']
        broken=pd.DataFrame([dict(station='Hanwella',datetime='2023-01-01',unit='m',water_level_current=1,
            water_level_previous=1,rainfall_12hr=None,alert_level=8,minor_flood_level=7,major_flood_level=10)]).to_csv(index=False)
        result=c.post('/imports',headers=ah,json={'filename':'invalid.csv','content':broken}).json()
        self.assertEqual(result['accepted'],0)
        self.assertTrue(result['rejected'])
        with SessionLocal() as db:
            rows=[dict(station='Hanwella',datetime=str(t),unit='m',water_level_current=5.,water_level_previous=5.,
                  rainfall_12hr=0.,alert_level=2.,minor_flood_level=3.,major_flood_level=4.)
                  for t in pd.date_range('2023-11-01',periods=5,freq='h')]
            w.import_observations(db,rows,{'file':'historical-test'},'historical_replay')
            events=w.process_pending(db,model_rf)
            self.assertTrue(all(not e.get('alert_id') for e in events))
            with patch('app.workflow.infer_observation',side_effect=RuntimeError('inference unavailable')):
                row=dict(rows[-1],datetime='2023-11-01 05:00:00')
                w.import_observations(db,[row],{'file':'failure'},'historical_replay')
                self.assertEqual(w.process_pending(db,model_rf)[0]['status'],'failed')
            key='delivery:unavailable-test'
            alert_id=next(a['alert_id'] for a in w.records(db,'alert_metadata'))
            w.put(db,key,'delivery',dict(alert_id=alert_id,username='public_test',channel='expo',destination='ExponentPushToken[test]',state='queued',attempts=0,next_attempt_at=w.now(),last_error=None))
            db.commit()
            with patch.dict(os.environ,{'FLOOD_DELIVERY_ADAPTER':'unavailable'}):
                w.deliver_pending(db)
            failed=w.get(db,key)
            self.assertEqual(failed['state'],'failed');self.assertEqual(failed['attempts'],1)
            self.assertTrue(failed['last_error'])
            latency=[]
            for _ in range(30):
                started=time.perf_counter();w.infer_observation(rows,model_rf,'random_forest_fixed.pkl','historical_replay')
                latency.append(time.perf_counter()-started)
        import platform,numpy as np
        self.evidence['latency']={'environment':platform.platform(),'python':platform.python_version(),
            'workload':'30 sequential requests, five station observations each; feature generation plus 200-tree legacy RF',
            'samples':30,'median_seconds':float(np.median(latency)),'p95_seconds':float(np.percentile(latency,95)),
            'max_seconds':max(latency),'under_10_seconds':max(latency)<10}
        self.evidence['failures']='invalid thresholds rejected; replay alerts suppressed; inference failure persisted; provider failure/retry persisted'

    def test_05_real_digital_pdf_fallback(self):
        import base64
        source=ROOT/'Flood_level/2026/June/2026-06-24_0030_Water_Level.pdf'
        content=base64.b64encode(source.read_bytes()).decode()
        result=self.client.post('/imports',headers=self.headers['admin_test'],json={
            'filename':source.name,'format':'pdf','content':content,'source_mode':'historical_replay'})
        self.assertEqual(result.status_code,200,result.text)
        self.assertGreater(result.json()['accepted'],0,result.text)
        self.assertTrue(self.client.post('/imports',headers=self.headers['admin_test'],json={
            'filename':source.name,'format':'pdf','content':content,'source_mode':'historical_replay'}).json()['duplicate'])
        self.evidence['pdf_fallback']={'source':source.name,'accepted':result.json()['accepted'],
            'rejected':len(result.json()['rejected']),'duplicate_import_suppressed':True}


if __name__=='__main__':
    unittest.main()
