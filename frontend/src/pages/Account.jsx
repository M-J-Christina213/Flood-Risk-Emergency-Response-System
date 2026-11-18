import { useEffect,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';

export default function Account() {
  const [station,setStation]=useState('Hanwella');
  const [basin,setBasin]=useState('');
  const [data,setData]=useState({subscriptions:[],deliveries:[],acknowledgements:[]});
  const [status,setStatus]=useState('Loading…');
  const navigate=useNavigate();
  async function refresh(){
    const [s,i]=await Promise.all([apiRequest('/subscriptions'),apiRequest('/inbox')]);setData({...s,...i});
  }
  async function run(fn){try{await fn();await refresh();setStatus('Updated');}catch(e){setStatus(e.message);}}
  useEffect(()=>{let active=true;Promise.all([apiRequest('/subscriptions'),apiRequest('/inbox')]).then(([s,i])=>{if(active){setData({...s,...i});setStatus('Ready');}}).catch(e=>{if(active)setStatus(e.message);});return()=>{active=false;};},[]);
  return <main className="max-w-3xl mx-auto p-6 space-y-4"><nav className="flex gap-4"><Link to="/alerts">Alerts</Link><Link to="/report">Report flooding</Link><Link to="/operations">Staff operations</Link></nav>
    <h1 className="text-2xl font-bold">Subscriptions and alert inbox</h1><p role="status">{status}</p>
    <form className="grid gap-3" onSubmit={e=>{e.preventDefault();run(()=>apiRequest('/subscriptions',{method:'POST',body:{station,basin}}));}}>
      <label>Station (leave empty for basin)<input className="border p-2" value={station} onChange={e=>setStation(e.target.value)}/></label>
      <label>Basin<select value={basin} onChange={e=>setBasin(e.target.value)}><option value="">Station subscription</option><option>Kelani Ganga</option><option>Kalu Ganga</option></select></label>
      <button className="border p-2">Subscribe to web alerts</button>
    </form>
    {data.subscriptions.map(s=><p key={s._id}>{s.station||s.basin} · {s.channel} <button onClick={()=>run(()=>apiRequest('/subscriptions/'+s._id,{method:'DELETE'}))}>Remove</button></p>)}
    <button onClick={()=>run(async()=>{})}>Refresh inbox</button>
    {!data.deliveries.length && <p>No alert deliveries for your subscriptions.</p>}
    {data.deliveries.map(d=><article className="border p-3" key={d._id}><p>{d.alert_id} · {d.state} · attempts: {d.attempts}</p><p>{d.last_error}</p>
      <button disabled={data.acknowledgements.some(a=>a.alert_id===d.alert_id)} onClick={()=>run(()=>apiRequest(`/alerts/${d.alert_id}/acknowledge`,{method:'POST'}))}>Acknowledge</button></article>)}
    <p>Test-recorded and provider-accepted states do not establish delivery to a device.</p>
    <button onClick={()=>run(async()=>{await apiRequest('/auth/logout',{method:'POST'});sessionStorage.removeItem('flood_token');navigate('/login');})}>Sign out</button>
  </main>;
}
