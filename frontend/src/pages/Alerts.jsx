import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchHealth, fetchAlerts } from "../services/api";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState("Loading saved alerts...");
  async function refresh() {
    setStatus("Loading saved alerts...");
    const health = await fetchHealth();
    if (health.status !== "healthy") { setStatus("API unavailable. Active warnings cannot be verified."); return; }
    const data = await fetchAlerts();
    if (data.error) { setStatus("Could not load warnings. Refresh to try again."); return; }
    const active = data.alerts.filter(alert => alert.status === "Active");
    setAlerts(active);
    setStatus(active.length ? `${active.length} active prototype warning(s).` : "No active warnings stored in this prototype.");
  }
  useEffect(() => { const timer = setTimeout(refresh, 0); return () => clearTimeout(timer); }, []);
  return (
    <main className="alerts-page" style={{ maxWidth: 720, margin: "2rem auto", padding: "1rem" }}>
      <Link to="/">Back to dashboard</Link>
      <h1>Saved Flood Alerts</h1>
      <p>Research prototype alerts, not official government warnings. <Link to="/account">Subscriptions and acknowledgements</Link></p>
      <button onClick={refresh}>Refresh alerts</button>
      <p role="status">{status}</p>
      {alerts.map(alert => <article key={alert.id} className="alert-card warning" style={{ padding: "1rem", marginTop: "1rem", border: "1px solid #ddd" }}>
        <h2>{alert.title}</h2><p>{alert.severity} - {alert.location || alert.station}</p>
        <p>{alert.message}</p><time>{new Date(alert.time).toLocaleString()}</time>
        <p>{alert.metadata?.source_mode} · {alert.metadata?.simulation ? 'REPLAY SIMULATION' : 'Prototype'} · {alert.metadata?.freshness_status || 'Manual warning'}</p>
        <p>Observation: {alert.metadata?.observation_time || 'Not associated'} · Model: {alert.metadata?.model_version || 'None'} · Target: {alert.metadata?.forecast_target_time || 'Next observation time unknown'}</p>
      </article>)}
    </main>
  );
}
