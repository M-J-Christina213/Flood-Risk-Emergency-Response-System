"""Persistent prototype workflows. Functions accept a DB session for CLI/tests/API."""
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
import uuid
import pandas as pd
from .models import WorkflowRecord, Alert, Report
from .ml_pipeline import build_features, feature_matrix, FEATURES, THRESHOLDS, STATIONS, RISK_LABELS, risk_label, valid_thresholds


def now():
    return datetime.now(timezone.utc).isoformat()


def records(db, kind):
    return [dict(json.loads(r.payload), _id=r.id) for r in db.query(WorkflowRecord).filter_by(kind=kind).all()]


def get(db, key):
    row = db.get(WorkflowRecord,key)
    return json.loads(row.payload) if row else None


def put(db, key, kind, data):
    row = db.get(WorkflowRecord,key)
    encoded = json.dumps(data,allow_nan=False,default=str)
    if row:
        row.payload = encoded
    else:
        db.add(WorkflowRecord(id=key,kind=kind,payload=encoded))
    db.flush()
    return data


def audit(db, entity, actor, action, detail):
    put(db,'audit:'+uuid.uuid4().hex,'audit',dict(entity=entity,actor=actor,action=action,detail=detail,time=now()))


def import_observations(db, rows, provenance, mode='manual_upload'):
    if mode not in ['manual_upload','historical_replay']:
        raise ValueError('Only manual uploads and historical replay are configured; no verified live adapter')
    fingerprint = sha256(json.dumps([rows,provenance,mode],sort_keys=True,default=str).encode()).hexdigest()
    batch_key='import:'+fingerprint
    previous = get(db,batch_key)
    if previous:
        return dict(previous,duplicate=True)
    accepted, rejected, duplicates = 0, [], 0
    for n, row in enumerate(rows):
        try:
            station = str(row['station']).strip()
            if station not in STATIONS:
                raise ValueError('Station outside provisional Kelani/Kalu coverage')
            dt = pd.Timestamp(row.get('datetime') or f"{row['date']} {row['time']}")
            if pd.isna(dt):
                raise ValueError('Missing timestamp')
            dt = dt.tz_localize('Asia/Colombo') if dt.tz is None else dt.tz_convert('Asia/Colombo')
            if dt > pd.Timestamp.now(tz='Asia/Colombo') + pd.Timedelta(minutes=5):
                raise ValueError('Future observation')
            payload = dict(row,station=station,datetime=dt.tz_localize(None).isoformat())
            for col in ['water_level_current','water_level_previous','rainfall_12hr']+THRESHOLDS:
                v = payload.get(col)
                payload[col] = None if v is None or pd.isna(v) else float(v)
            if payload.get('unit') not in ['m','ft'] or not valid_thresholds([payload[c] for c in THRESHOLDS]):
                raise ValueError('Unknown units or invalid thresholds')
            if payload['water_level_current'] is None or not pd.notna(payload['water_level_current']):
                raise ValueError('Current level required')
            # JSON encoding checks infinity too; no invented numeric defaults.
            json.dumps(payload,allow_nan=False)
            if payload['rainfall_12hr'] is not None and payload['rainfall_12hr'] < 0:
                raise ValueError('Negative rainfall')
            key = 'observation:'+sha256(f'{station}|{payload["datetime"]}'.encode()).hexdigest()
            old = get(db,key)
            core = {k:payload.get(k) for k in ['station','datetime','unit','water_level_current','water_level_previous','rainfall_12hr']+THRESHOLDS}
            if old:
                if old['observation'] != core:
                    raise ValueError('Conflicting observation at the same station/time; retained original')
                duplicates += 1
                continue
            put(db,key,'observation',dict(observation=core,source=provenance,source_mode=mode,imported_at=now(),batch=fingerprint))
            accepted += 1
        except (ValueError,TypeError,KeyError) as exc:
            rejected.append({'row':n+1,'reason':str(exc)})
    result=dict(batch=fingerprint,source=provenance,source_mode=mode,accepted=accepted,duplicates=duplicates,
                rejected=rejected,status='partial' if rejected and accepted else 'failed' if rejected else 'success',
                completed_at=now(),last_successful_update=now() if accepted else None)
    put(db,batch_key,'import',result)
    audit(db,batch_key,'ingestion','import',result)
    db.commit()
    return result


def infer_observation(history, model, version, source_mode, clock=None):
    d = build_features(pd.DataFrame(history))
    row = d.iloc[-1:]
    if row.exclusion_reason.iloc[0]:
        raise ValueError(row.exclusion_reason.iloc[0])
    if list(model.feature_names_in_) != FEATURES:
        raise ValueError('Active model schema differs from shared 17-feature contract')
    value = float(model.predict(feature_matrix(row))[0])
    import math
    if not math.isfinite(value):
        raise ValueError('Non-finite model output')
    observed = pd.Timestamp(row.datetime.iloc[0]).tz_localize('Asia/Colombo')
    current = pd.Timestamp(clock or now())
    age = (current-observed).total_seconds()
    fresh = 0 <= age <= float(os.getenv('FLOOD_MAX_AGE_SECONDS','21600'))
    return dict(station=row.station.iloc[0],basin=STATIONS[row.station.iloc[0]],
                current_water_level=float(row.water_level_current.iloc[0]),predicted_water_level=value,
                rainfall_12hr=float(row.rainfall_12hr.iloc[0]),
                alert_level=float(row.alert_level.iloc[0]),minor_flood_level=float(row.minor_flood_level.iloc[0]),
                major_flood_level=float(row.major_flood_level.iloc[0]),
                river=STATIONS[row.station.iloc[0]],river_basin=STATIONS[row.station.iloc[0]],
                datetime=observed.isoformat(),model='Random Forest',
                risk_level=risk_label(value,row[THRESHOLDS].iloc[0]),observation_time=observed.isoformat(),
                prediction_generated_at=now(),forecast_target_time=None,forecast_horizon='next_observation_variable',
                source_mode=source_mode,model_version=version,freshness_status='fresh' if fresh else 'stale',
                predictive_alert_eligible=fresh and source_mode!='historical_replay',
                prototype=True,level_unit='m',model_limitations='Legacy RF trained on mixed, unaudited data; not an official warning')


def generate_alert(db, prediction, event_key, replay=False):
    if not prediction['predictive_alert_eligible'] and not (replay and prediction['source_mode']=='historical_replay'):
        return None
    risk=prediction['risk_level']
    if risk not in RISK_LABELS or risk=='Low':
        return None
    station=prediction['station']
    previous=[a for a in records(db,'alert_metadata') if a['station']==station and a['simulation']==replay]
    previous.sort(key=lambda a:a['created_at'])
    if previous:
        last=previous[-1]
        cooldown=float(os.getenv('FLOOD_ALERT_COOLDOWN_SECONDS','3600'))
        elapsed=(datetime.fromisoformat(now())-datetime.fromisoformat(last['created_at'])).total_seconds()
        # Increases bypass cooldown; same/decreasing risk waits for cooldown.
        if RISK_LABELS.index(risk)<=RISK_LABELS.index(last['risk_level']) and elapsed<cooldown:
            return None
    ident='AUTO'+sha256(event_key.encode()).hexdigest()[:24]
    if db.get(Alert,ident):
        return ident
    db.add(Alert(id=ident,title=('REPLAY SIMULATION: ' if replay else 'PROTOTYPE: ')+risk+' station risk',station=station,
                 river=prediction['basin'],message='Research prediction. Not an official government warning.',
                 severity=risk,status='Active',time=now()))
    meta=dict(prediction,alert_id=ident,simulation=replay,created_at=now(),lifecycle='active')
    put(db,'alert_metadata:'+ident,'alert_metadata',meta)
    for sub in records(db,'subscription'):
        if sub['station'] not in ['',station] or sub['basin'] not in ['',prediction['basin']]:
            continue
        key='delivery:'+ident+':'+sub['username']+':'+sub['channel']
        put(db,key,'delivery',dict(alert_id=ident,username=sub['username'],channel=sub['channel'],destination=sub.get('destination',''),
                                   state='queued',attempts=0,next_attempt_at=now(),last_error=None,simulation=replay))
    audit(db,ident,'worker','alert_created',meta)
    return ident


def process_pending(db, model, version='random_forest_fixed.pkl', replay_alerts=False):
    observations=records(db,'observation')
    observations.sort(key=lambda r:(r['observation']['datetime'],r['observation']['station']))
    outcomes=[]
    for item in observations:
        key='prediction_event:'+sha256((item['_id']+version).encode()).hexdigest()
        if get(db,key):
            continue
        o=item['observation']
        history=[r['observation'] for r in observations if r['observation']['station']==o['station']
                 and r['observation']['datetime']<=o['datetime']]
        try:
            result=infer_observation(history,model,version,item['source_mode'])
            result['status']='success'
            result['alert_id']=generate_alert(db,result,key,replay_alerts and item['source_mode']=='historical_replay')
        except Exception as exc:
            result=dict(status='failed',station=o['station'],observation_time=o['datetime'],source_mode=item['source_mode'],error=str(exc),time=now())
        put(db,key,'prediction_event',result)
        outcomes.append(result)
        db.commit()
    return outcomes


def deliver_pending(db):
    """Test adapter persists attempts but NEVER asserts provider delivery.

    Expo supports provider-accepted tickets; receipts are explicitly unverified.
    No credential or destination is included in public alert responses.
    """
    import urllib.request
    for item in records(db,'delivery'):
        if item['state'] not in ['queued','failed'] or item['attempts']>=3 or item['next_attempt_at']>now():
            continue
        item['attempts']+=1
        attempt=dict(delivery=item['_id'],time=now(),attempt=item['attempts'])
        alert=db.get(Alert,item['alert_id'])
        try:
            if not alert or alert.status!='Active':
                item['state']='cancelled'
            elif item['channel']=='web':
                item['state']='available_in_web_inbox'
            elif os.getenv('FLOOD_DELIVERY_ADAPTER','test')=='test':
                item['state']='test_recorded'
            elif os.getenv('FLOOD_DELIVERY_ADAPTER')=='expo' and item['channel']=='expo':
                headers={'Content-Type':'application/json'}
                if os.getenv('EXPO_ACCESS_TOKEN'):
                    headers['Authorization']='Bearer '+os.environ['EXPO_ACCESS_TOKEN']
                request=urllib.request.Request('https://exp.host/--/api/v2/push/send',
                    data=json.dumps({'to':item['destination'],'title':alert.title,'body':alert.message}).encode(),headers=headers)
                with urllib.request.urlopen(request,timeout=10) as response:
                    ticket=json.load(response)['data']
                if ticket.get('status')!='ok':
                    raise ValueError('Expo rejected notification')
                item['state']='provider_accepted'
                item['provider_ticket']=ticket['id']
            else:
                raise ValueError('Notification provider unavailable or unsupported')
            item['last_error']=None
        except Exception as exc:
            from datetime import timedelta
            item['state']='failed'; item['last_error']=str(exc)
            item['next_attempt_at']=(datetime.now(timezone.utc)+timedelta(seconds=30*2**item['attempts'])).isoformat()
        attempt['state']=item['state']; attempt['error']=item['last_error']
        put(db,'attempt:'+uuid.uuid4().hex,'delivery_attempt',attempt)
        put(db,item.pop('_id'),'delivery',item)
        db.commit()


LEGACY_STATUS={'new':'submitted','verified':'reviewed','dispatched':'in_progress','resolved':'resolved'}
TRANSITIONS={'submitted':'reviewed','reviewed':'assigned','assigned':'in_progress','in_progress':'resolved'}


def report_detail(db, report):
    return get(db,'report_detail:'+report.id) or dict(report_id=report.id,status=LEGACY_STATUS.get(report.status,report.status),
                coordinator=None,station='',basin='',notes='',updated_at=report.submitted_at)


def transition_report(db, report, status, actor, coordinator=None, notes='', station='', basin=''):
    detail=report_detail(db,report)
    old=detail['status']
    if status!=old and TRANSITIONS.get(old)!=status:
        raise ValueError('Follow submitted -> reviewed -> assigned -> in_progress -> resolved')
    if status=='assigned' and not (coordinator or detail['coordinator']):
        raise ValueError('A coordinator is required for assignment')
    if actor.role!='admin' and detail['coordinator'] and detail['coordinator']!=actor.username:
        raise PermissionError('Report belongs to another coordinator')
    if station and station not in STATIONS:
        raise ValueError('Unsupported station')
    if basin and basin not in ['Kelani Ganga','Kalu Ganga']:
        raise ValueError('Unsupported basin')
    if station and basin and STATIONS[station]!=basin:
        raise ValueError('Station and basin disagree')
    detail.update(status=status,coordinator=coordinator or detail['coordinator'],notes=notes,
                  station=station or detail['station'],basin=STATIONS.get(station) or basin or detail['basin'],updated_at=now())
    put(db,'report_detail:'+report.id,'report_detail',detail)
    # Compatible legacy fields remain meaningful to existing read-only screens.
    report.status={'submitted':'new','reviewed':'verified','assigned':'assigned','in_progress':'dispatched','resolved':'resolved'}[status]
    if status!=old or notes:
        audit(db,report.id,actor.username,'report_transition',dict(previous=old,**detail))
    db.commit()
    return detail
