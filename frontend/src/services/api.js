const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const apiFetch = (url, options = {}) => fetch(url, {
  signal: AbortSignal.timeout(10000), ...options,
  headers: { ...(sessionStorage.getItem('flood_token') ? { Authorization: `Bearer ${sessionStorage.getItem('flood_token')}` } : {}), ...options.headers },
});

export async function apiRequest(path, options = {}) {
  const res = await apiFetch(`${API_BASE_URL}${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${typeof data.detail === 'string' ? data.detail : 'Request rejected; check inputs and permissions'}`);
  return data;
}

export async function fetchHealth() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("API unhealthy");
    return await res.json();
  } catch (error) {
    console.error("Health check failed:", error);
    return { status: "offline", model_loaded: false, dataset_loaded: false, stations: 0 };
  }
}

export async function fetchStations() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/stations`);
    if (!res.ok) throw new Error("Failed to fetch stations");
    return await res.json();
  } catch (error) {
    console.error("fetchStations failed:", error);
    return { count: 0, stations: [] };
  }
}

export async function fetchStationInfo(stationName) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/station/${encodeURIComponent(stationName)}`);
    if (!res.ok) throw new Error(`Failed to fetch station ${stationName}`);
    return await res.json();
  } catch (error) {
    console.error(`fetchStationInfo for ${stationName} failed:`, error);
    return null;
  }
}

export async function fetchStationPrediction(stationName) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/predict/${encodeURIComponent(stationName)}`);
    if (!res.ok) throw new Error(`Failed to fetch prediction for ${stationName}`);
    return await res.json();
  } catch (error) {
    console.error(`fetchStationPrediction for ${stationName} failed:`, error);
    return null;
  }
}

export async function fetchCitizenReports() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/reports`);
    if (!res.ok) throw new Error("Failed to fetch citizen reports");
    return await res.json();
  } catch (error) {
    console.error("fetchCitizenReports failed:", error);
    return { count: 0, reports: [], error: error.message };
  }
}

export async function submitCitizenReport(reportData) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData),
    });
    if (!res.ok) throw new Error("Failed to submit report");
    return await res.json();
  } catch (error) {
    console.error("submitCitizenReport failed:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchPriorityAreas() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/priority-areas`);
    if (!res.ok) throw new Error('Failed to fetch priority areas');
    return await res.json();
  } catch (error) {
    console.error('fetchPriorityAreas failed:', error);
    return { count: 0, priority_areas: [] };
  }
}

export async function fetchAlerts() {
  try {
    const res = await apiFetch(`${API_BASE_URL}/alerts`);
    if (!res.ok) throw new Error("Failed to fetch alerts");
    return await res.json();
  } catch (error) {
    console.error("fetchAlerts failed:", error);
    return { count: 0, alerts: [], error: error.message };
  }
}

export async function createAlert(alertData) {
  try {
    const res = await apiFetch(`${API_BASE_URL}/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alertData),
    });
    if (!res.ok) throw new Error("Failed to create alert");
    return await res.json();
  } catch (error) {
    console.error("createAlert failed:", error);
    return { success: false, error: error.message };
  }
}


export async function updateReportStatus(reportId, status) {
  const res = await apiFetch(`${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Could not save report status. Refresh and try again.");
  return res.json();
}

export async function revokeAlert(alertId) {
  const res = await apiFetch(`${API_BASE_URL}/alerts/${encodeURIComponent(alertId)}/revoke`, { method: "PATCH" });
  if (!res.ok) throw new Error("Could not revoke alert. Refresh and try again.");
  return res.json();
}
