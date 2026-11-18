import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/api';

export default function AccessGate({children,staff=false}) {
  const [state,setState]=useState({loading:true,user:null,error:''});
  useEffect(()=>{
    let active=true;
    apiRequest('/auth/me').then(user=>{if(active)setState({loading:false,user,error:''});})
      .catch(error=>{if(active)setState({loading:false,user:null,error:error.message});});
    return ()=>{active=false;};
  },[]);
  if(state.loading)return <p role="status" className="p-8">Checking access…</p>;
  if(!state.user)return <main className="p-8"><p role="alert">{state.error}</p><Link to="/login">Sign in</Link> · <Link to="/alerts">Public alerts</Link></main>;
  if(staff && !['admin','coordinator'].includes(state.user.role))return <main className="p-8"><p>Staff access required.</p><Link to="/account">My subscriptions</Link></main>;
  return children;
}
