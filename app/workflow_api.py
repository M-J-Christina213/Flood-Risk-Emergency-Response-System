import base64
import hashlib
from io import StringIO
import json
from pathlib import Path
import uuid
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal
from .auth import current_user, staff, admin
from .database import get_db
from .models import Report, User, Alert
from . import workflow as w
from .ml_pipeline import STATIONS, FEATURES

router=APIRouter()


class ImportRequest(BaseModel):
    filename: str = Field(min_length=1,max_length=200)
    content: str = Field(min_length=1,max_length=7_000_000)
    format: Literal['csv','pdf'] = 'csv'
    source_mode: Literal['manual_upload','historical_replay'] = 'manual_upload'


@router.post('/imports')
def import_data(body: ImportRequest, user=Depends(admin),db: Session=Depends(get_db)):
    provenance=dict(filename=Path(body.filename).name,sha256=hashlib.sha256(body.content.encode()).hexdigest(),uploaded_by=user.username)
    try:
        if body.format=='csv':
            rows=pd.read_csv(StringIO(body.content)).astype(object).where(lambda d:d.notna(),None).to_dict('records')
        else:
            from scripts.batch_extract import extract_pdf
            root=Path(__file__).resolve().parents[1]
            data=base64.b64decode(body.content,validate=True)
            if not data.startswith(b'%PDF-') or len(data)>5_000_000:
                raise ValueError('Expected PDF under 5 MB')
            path=root/'.demo/imports'/f'{hashlib.sha256(data).hexdigest()}.pdf'
            path.parent.mkdir(parents=True,exist_ok=True)
            if not path.exists():
                path.write_bytes(data)
            rows=extract_pdf(path)
            provenance['retained_file']=str(path.relative_to(root))
        if not rows or len(rows)>50000:
            raise ValueError('Import must contain 1 to 50,000 rows; scanned PDFs require reviewed OCR/CSV')
        return w.import_observations(db,rows,provenance,body.source_mode)
    except Exception as exc:
        failure=dict(status='failed',source=provenance,error=str(exc),time=w.now())
        w.put(db,'import_failure:'+uuid.uuid4().hex,'import_failure',failure); db.commit()
        raise HTTPException(422,str(exc))


@router.get('/ingestion/status')
def ingestion_status(user=Depends(staff),db: Session=Depends(get_db)):
    return dict(imports=w.records(db,'import'),failures=w.records(db,'import_failure'),
                live_source_status='blocked: no supported official feed configured; historical downloader is not live ingestion')


@router.post('/worker/run')
def worker_run(user=Depends(admin),db: Session=Depends(get_db)):
    from .main import model_rf
    events=w.process_pending(db,model_rf)
    w.deliver_pending(db)
    return {'events':events}


@router.get('/predictions/events')
def prediction_events(user=Depends(staff),db: Session=Depends(get_db)):
    return {'events':w.records(db,'prediction_event')}


class Subscription(BaseModel):
    station: str = Field(default='',max_length=100)
    basin: str = Field(default='',max_length=100)
    channel: Literal['web','expo'] = 'web'
    destination: str = Field(default='',max_length=250)


@router.post('/subscriptions')
def subscribe(body: Subscription,user=Depends(current_user),db: Session=Depends(get_db)):
    if (not body.station and not body.basin) or (body.station and body.station not in STATIONS) or (body.basin and body.basin not in set(STATIONS.values())):
        raise HTTPException(422,'Choose a supported station or basin')
    if body.station and body.basin and STATIONS[body.station]!=body.basin:
        raise HTTPException(422,'Station and basin disagree')
    if body.channel=='expo' and not body.destination.startswith(('ExponentPushToken[','ExpoPushToken[')):
        raise HTTPException(422,'Valid Expo token required')
    key='subscription:'+hashlib.sha256(f'{user.username}|{body.station}|{body.basin}|{body.channel}'.encode()).hexdigest()
    w.put(db,key,'subscription',dict(body.model_dump(),username=user.username));db.commit()
    return {'success':True,'id':key}


@router.get('/subscriptions')
def subscriptions(user=Depends(current_user),db: Session=Depends(get_db)):
    return {'subscriptions':[s for s in w.records(db,'subscription') if s['username']==user.username]}


@router.delete('/subscriptions/{subscription_id}')
def unsubscribe(subscription_id: str,user=Depends(current_user),db: Session=Depends(get_db)):
    from .models import WorkflowRecord
    item=w.get(db,subscription_id)
    if not item or item.get('username')!=user.username:
        raise HTTPException(404,'Subscription not found')
    db.delete(db.get(WorkflowRecord,subscription_id));db.commit()
    return {'success':True}


@router.get('/inbox')
def inbox(user=Depends(current_user),db: Session=Depends(get_db)):
    deliveries=[{k:v for k,v in r.items() if k!='destination'} for r in w.records(db,'delivery') if r['username']==user.username]
    return {'deliveries':deliveries,'acknowledgements':[a for a in w.records(db,'ack') if a['username']==user.username]}


@router.post('/alerts/{alert_id}/acknowledge')
def acknowledge(alert_id: str,user=Depends(current_user),db: Session=Depends(get_db)):
    if not db.get(Alert,alert_id):
        raise HTTPException(404,'Alert not found')
    key='ack:'+alert_id+':'+user.username
    existing=w.get(db,key)
    if not existing:
        w.put(db,key,'ack',dict(alert_id=alert_id,username=user.username,time=w.now()))
        w.audit(db,alert_id,user.username,'acknowledged',{})
        db.commit()
    return {'success':True,'acknowledgement':w.get(db,key)}


@router.get('/coordination/reports')
def reports(user=Depends(staff),db: Session=Depends(get_db)):
    return {'reports':[dict(id=r.id,latitude=r.latitude,longitude=r.longitude,severity=r.severity,
        description=r.description,report_type=r.report_type,**w.report_detail(db,r)) for r in db.query(Report).all()]}


@router.get('/coordination/coordinators')
def coordinators(user=Depends(staff),db: Session=Depends(get_db)):
    return {'coordinators':[u.username for u in db.query(User).filter_by(role='coordinator',active=True).all()]}


class Transition(BaseModel):
    status: Literal['submitted','reviewed','assigned','in_progress','resolved']
    coordinator: str | None = Field(default=None,max_length=80)
    notes: str = Field(default='',max_length=5000)
    station: str = Field(default='',max_length=100)
    basin: str = Field(default='',max_length=100)


@router.patch('/coordination/reports/{report_id}')
def transition(report_id: str,body: Transition,user=Depends(staff),db: Session=Depends(get_db)):
    report=db.get(Report,report_id)
    if not report:
        raise HTTPException(404,'Report not found')
    if body.coordinator:
        coordinator=db.get(User,body.coordinator)
        if not coordinator or coordinator.role!='coordinator' or not coordinator.active:
            raise HTTPException(422,'Active coordinator required')
    try:
        detail=w.transition_report(db,report,actor=user,**body.model_dump())
    except ValueError as exc:
        raise HTTPException(409,str(exc))
    except PermissionError as exc:
        raise HTTPException(403,str(exc))
    return {'report':detail}


@router.get('/coordination/reports/{report_id}/history')
def history(report_id: str,user=Depends(staff),db: Session=Depends(get_db)):
    if not db.get(Report,report_id):
        raise HTTPException(404,'Report not found')
    return {'history':[a for a in w.records(db,'audit') if a['entity']==report_id],
            'actions':[a for a in w.records(db,'response_action') if a['report_id']==report_id]}


class ResponseAction(BaseModel):
    description: str = Field(min_length=1,max_length=5000)
    status: Literal['planned','in_progress','completed','cancelled'] = 'planned'


@router.post('/coordination/reports/{report_id}/actions')
def action(report_id: str,body: ResponseAction,user=Depends(staff),db: Session=Depends(get_db)):
    report=db.get(Report,report_id)
    if not report:
        raise HTTPException(404,'Report not found')
    detail=w.report_detail(db,report)
    if user.role!='admin' and detail['coordinator']!=user.username:
        raise HTTPException(403,'Assigned coordinator required')
    key='action:'+uuid.uuid4().hex
    result=dict(body.model_dump(),report_id=report_id,actor=user.username,time=w.now(),manual=True)
    w.put(db,key,'response_action',result);w.audit(db,report_id,user.username,'manual_response_action',result);db.commit()
    return {'id':key,**result}


@router.patch('/coordination/actions/{action_id}')
def action_update(action_id: str,body: ResponseAction,user=Depends(staff),db: Session=Depends(get_db)):
    old=w.get(db,action_id)
    if not old or not action_id.startswith('action:'):
        raise HTTPException(404,'Action not found')
    report=db.get(Report,old['report_id'])
    if user.role!='admin' and w.report_detail(db,report)['coordinator']!=user.username:
        raise HTTPException(403,'Assigned coordinator required')
    allowed={'planned':['in_progress','cancelled'],'in_progress':['completed','cancelled'],'completed':[],'cancelled':[]}
    if body.status!=old['status'] and body.status not in allowed[old['status']]:
        raise HTTPException(409,'Invalid action transition')
    result=dict(old,**body.model_dump(),updated_at=w.now())
    w.put(db,action_id,'response_action',result);w.audit(db,old['report_id'],user.username,'response_action_update',result);db.commit()
    return result


@router.get('/admin/models')
def model_versions(user=Depends(admin)):
    from .main import MODEL_RF_PATH,MODEL_RF_SHA256,model_rf
    root=Path(__file__).resolve().parents[1]
    return dict(active={'version':MODEL_RF_PATH.name,'sha256':MODEL_RF_SHA256,
                        'features':list(model_rf.feature_names_in_),'status':'legacy prototype; not changed'},
                candidates=[json.loads(p.read_text(encoding='utf-8')) for p in sorted((root/'research/runs').glob('*/metrics.json'))],
                retrain_command='python scripts/train_ml.py --candidates 2 --folds 3 --jobs 2 --boosting',
                activation='No HTTP activation or retraining; preserves active model on failure')
