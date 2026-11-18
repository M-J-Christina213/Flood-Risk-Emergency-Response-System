import { useState } from "react";
import { Link } from "react-router-dom";
import { submitCitizenReport } from "../services/api";

export default function ReportFlood() {
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [type, setType] = useState("road");
  const [severity, setSeverity] = useState("moderate");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function locate() {
    if (!navigator.geolocation) { setMessage("Location unavailable. Enter coordinates manually."); return; }
    navigator.geolocation.getCurrentPosition(position => {
      setLatitude(String(position.coords.latitude));
      setLongitude(String(position.coords.longitude));
      setMessage("Location captured. Review before submitting.");
    }, () => setMessage("Location unavailable. Enter coordinates manually."), { timeout: 10000 });
  }

  async function submitReport(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await submitCitizenReport({
      latitude: Number(latitude), longitude: Number(longitude),
      report_type: type, severity, description, anonymous: true,
      client_request_id: requestId,
    });
    setBusy(false);
    if (result.success) setRequestId(crypto.randomUUID());
    setMessage(result.success ? `Report saved. ID: ${result.report.id}. Status: ${result.report.status}.` : "Report was not saved. Check the API connection and try again.");
  }

  return (
    <main className="report-page" style={{ maxWidth: 640, margin: "2rem auto", padding: "1rem" }}>
      <Link to="/">Back to dashboard</Link>
      <h1>Report Flooding</h1>
      <p>Supervisor prototype. Reports are saved locally for review; submitting does not contact emergency services.</p>
      <form onSubmit={submitReport} style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
        <button type="button" onClick={locate}>Use my location</button>
        <label>Latitude <input aria-label="Latitude" type="number" step="any" min="-90" max="90" required value={latitude} onChange={e => setLatitude(e.target.value)} /></label>
        <label>Longitude <input aria-label="Longitude" type="number" step="any" min="-180" max="180" required value={longitude} onChange={e => setLongitude(e.target.value)} /></label>
        <label>Report type <select value={type} onChange={e => setType(e.target.value)}>
          <option value="road">Road flooding</option><option value="river">River overflow</option>
          <option value="building">Building flooding</option><option value="blocked">Road / bridge blocked</option>
        </select></label>
        <label>Severity <select value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="minor">Minor</option><option value="moderate">Moderate</option>
          <option value="severe">Severe</option><option value="critical">Critical</option>
        </select></label>
        <label>Description <textarea value={description} onChange={e => setDescription(e.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? "Saving..." : "Submit Flood Report"}</button>
      </form>
      <p role="status" style={{ marginTop: "1rem" }}>{message}</p>
    </main>
  );
}
