import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';

const nextStatus={submitted:'reviewed',reviewed:'assigned',assigned:'in_progress',in_progress:'resolved'};

function Report({report,coordinators,refresh,run}) {
  const [coordinator,setCoordinator]=useState(report.coordinator||'');
  const [notes,setNotes]=useState('');
  const [station,setStation]=useState(report.station||'');
  const [history,setHistory]=useState(null);
  const [action,setAction]=useState('');
  return <article className="border rounded p-4 space-y-3">
    <h2 className="font-bold">{report.report_type} · {report.severity} · {report.status}</h2>
    <p>{report.id} · {report.latitude}, {report.longitude}</p><p>{report.description}</p>
    <p>Assigned: {report.coordinator||'Unassigned'} · {report.basin||'Basin not associated'}</p>
    <label>Coordinator<select aria-label={`Coordinator ${report.id}`} className="border p-2" value={coordinator} onChange={e=>setCoordinator(e.target.value)}><option value="">Choose coordinator</option>{coordinators.map(c=><option key={c}>{c}</option>)}</select></label>
    <label>Station<input className="border p-2" placeholder="e.g. Hanwella" value={station} onChange={e=>setStation(e.target.value)}/></label>
    <label>Review notes<textarea className="border w-full p-2" value={notes} onChange={e=>setNotes(e.target.value)}/></label>
    {nextStatus[report.status] && <button className="bg-blue-700 text-white p-2" onClick={()=>run(async()=>{
      await apiRequest(`/coordination/reports/${report.id}`,{method:'PATCH',body:{status:nextStatus[report.status],coordinator:coordinator||null,station,notes}});await refresh();
    })}>Move to {nextStatus[report.status]}</button>}
    <button className="border p-2 ml-2" onClick={()=>run(async()=>setHistory(await apiRequest(`/coordination/reports/${report.id}/history`)))}>View history and actions</button>
    <label>Manual response action<input className="border p-2 w-full" value={action} onChange={e=>setAction(e.target.value)} placeholder="Record a real manual action; no automatic dispatch"/></label>
    <button className="border p-2" disabled={!action.trim()} onClick={()=>run(async()=>{
      await apiRequest(`/coordination/reports/${report.id}/actions`,{method:'POST',body:{description:action,status:'planned'}});setAction('');setHistory(await apiRequest(`/coordination/reports/${report.id}/history`));
    })}>Log planned action</button>
    {history && <div><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(history.history,null,2)}</pre>{history.actions.map(a=><div key={a._id} className="border p-2">
      {a.description} · {a.status}
      {['planned','in_progress'].includes(a.status) && <button className="border p-1 ml-2" onClick={()=>run(async()=>{
        await apiRequest(`/coordination/actions/${a._id}`,{method:'PATCH',body:{description:a.description,status:a.status==='planned'?'in_progress':'completed'}});setHistory(await apiRequest(`/coordination/reports/${report.id}/history`));
      })}>Mark {a.status==='planned'?'in progress':'completed'}</button>}
    </div>)}</div>}
  </article>;
}

export default function Operations() {
  const [data,setData]=useState({reports:[],coordinators:[],role:''});
  const [status,setStatus]=useState('Loading…');
  const [busy,setBusy]=useState(false);
  const [mode,setMode]=useState('manual_upload');
  const [result,setResult]=useState(null);
  async function refresh() {
    const [reports,people,user]=await Promise.all([apiRequest('/coordination/reports'),apiRequest('/coordination/coordinators'),apiRequest('/auth/me')]);
    setData({reports:reports.reports,coordinators:people.coordinators,role:user.role});
  }
  async function run(fn) {
    setBusy(true);setStatus('Working…');
    try{await fn();setStatus('Saved. Refresh to retrieve other users’ changes.');}
    catch(error){setStatus(error.message);}
    finally{setBusy(false);}
  }
  useEffect(()=>{let active=true;Promise.all([apiRequest('/coordination/reports'),apiRequest('/coordination/coordinators'),apiRequest('/auth/me')]).then(([r,c,u])=>{
    if(active){setData({reports:r.reports,coordinators:c.coordinators,role:u.role});setStatus('Ready');}
  }).catch(error=>{if(active)setStatus(error.message);});return()=>{active=false;};},[]);
  async function upload(file) {
    if(!file)return;
    await run(async()=>{
      const pdf=file.name.toLowerCase().endsWith('.pdf');
      if(file.size>5_000_000)throw new Error('File must be under 5 MB');
      const content=pdf?await new Promise((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);
      }):await file.text();
      setResult(await apiRequest('/imports',{method:'POST',body:{filename:file.name,content,format:pdf?'pdf':'csv',source_mode:mode}}));
    });
  }
  return <main className="max-w-5xl mx-auto p-6 space-y-5">
    <nav className="flex gap-5"><Link to="/">Dashboard</Link><Link to="/alerts">Alerts</Link><Link to="/account">Account</Link></nav>
    <h1 className="font-bold text-2xl">Coordination and data operations</h1>
    <p>Kelani/Kalu research prototype. Actions log human coordination; they do not deploy resources. Station markers are not inundation boundaries.</p>
    <p role="status">{status}</p><button disabled={busy} className="border p-2" onClick={()=>run(refresh)}>Refresh</button>
    {data.role==='admin' && <section className="border p-4 space-y-3"><h2 className="font-bold">Validated observation imports</h2>
      <p>CSV columns: station, datetime, unit, water_level_current, water_level_previous, rainfall_12hr, alert_level, minor_flood_level, major_flood_level. PDF uses the existing digital-table parser; rejected rows require review.</p>
      <select aria-label="Source mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="manual_upload">Manual upload</option><option value="historical_replay">Historical replay</option></select>
      <input aria-label="Observation file" type="file" accept=".csv,.pdf" disabled={busy} onChange={e=>upload(e.target.files[0])}/>
      <div className="flex gap-3"><button disabled={busy} className="border p-2" onClick={()=>run(async()=>setResult(await apiRequest('/worker/run',{method:'POST'})))}>Process pending observations</button>
      <button className="border p-2" onClick={()=>run(async()=>setResult(await apiRequest('/ingestion/status')))}>Import history</button>
      <button className="border p-2" onClick={()=>run(async()=>setResult(await apiRequest('/admin/models')))}>Model versions and retraining</button></div>
      <p>No verified live feed. A separate worker can process imports on a schedule; opening this page is not required.</p>
      {result && <pre className="text-xs max-h-96 overflow-auto whitespace-pre-wrap">{JSON.stringify(result,null,2)}</pre>}
    </section>}
    <section className="space-y-4"><h2 className="font-bold">Reports</h2>{!data.reports.length && <p>No reports to review.</p>}
      <fieldset disabled={busy} className="space-y-4">{data.reports.map(r=><Report key={r.id} report={r} coordinators={data.coordinators} refresh={refresh} run={run}/>)}</fieldset>
    </section>
  </main>;
}
