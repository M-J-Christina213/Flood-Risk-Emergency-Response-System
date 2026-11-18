import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api';

export default function SignIn() {
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const navigate=useNavigate();
  async function submit(event) {
    event.preventDefault();setBusy(true);setMessage('');
    try {
      const result=await apiRequest('/auth/login',{method:'POST',body:{username,password}});
      sessionStorage.setItem('flood_token',result.access_token);
      navigate(result.role==='public'?'/account':'/');
    } catch(error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function register() {
    setBusy(true);
    try { await apiRequest('/auth/register',{method:'POST',body:{username,password}});setMessage('Public account created. Sign in to continue.'); }
    catch(error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <main className="max-w-lg mx-auto p-8 space-y-4">
    <h1 className="text-2xl font-bold">Flood prototype sign in</h1>
    <p>Staff accounts are created with the administrative command. Registration creates a public account.</p>
    <form onSubmit={submit} className="grid gap-4">
      <label>Username<input className="border p-2 w-full" required autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)}/></label>
      <label>Password<input className="border p-2 w-full" required minLength={10} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button disabled={busy} className="bg-blue-700 text-white p-2">{busy?'Working…':'Sign in'}</button>
      <button type="button" disabled={busy} onClick={register}>Create public account</button>
    </form><p role="status">{message}</p><Link to="/alerts">Public alerts</Link>
  </main>;
}
