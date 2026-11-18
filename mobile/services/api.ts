import AsyncStorage from '@react-native-async-storage/async-storage';

// API Base URL for Mobile Application
// Uses localhost / 127.0.0.1 for local dev/simulator, customizable for device testing
// For Android Emulator, use http://10.0.2.2:8000
// For physical device, use your current WiFi IP address (e.g. http://192.168.1.x:8000)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000";
let sessionToken: string | null = null;

export async function mobileRequest(path: string, options: { method?: string; body?: unknown } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || 'GET', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`${response.status}: ${typeof data.detail === 'string' ? data.detail : 'Request rejected'}`);
    return data;
  } finally { clearTimeout(timeout); }
}

export async function signIn(username: string, password: string) {
  const data = await mobileRequest('/auth/login', { method: 'POST', body: { username, password } });
  sessionToken = data.access_token;
  return data;
}

export async function signOut() {
  try { await mobileRequest('/auth/logout', { method: 'POST' }); }
  finally { sessionToken = null; }
}

export interface StationPrediction {
  station: string;
  datetime?: string;
  river?: string | null;
  river_basin?: string | null;
  current_water_level: number;
  predicted_water_level: number;
  rainfall_12hr: number;
  risk_level: "Low" | "Moderate" | "High" | "Very High" | "Unknown";
  alert_level?: number | null;
  minor_flood_level?: number | null;
  major_flood_level?: number | null;
  model?: string;
  model_version?: string;
  prediction_generated_at?: string;
  observation_time?: string;
  source_mode?: string;
  freshness_status?: string;
  forecast_target_time?: string | null;
  forecast_horizon?: string;
}


export interface CitizenReportPayload {
  latitude: number;
  longitude: number;
  report_type: string;
  description: string;
  severity: "minor" | "moderate" | "severe" | "critical";
  anonymous?: boolean;
  client_request_id?: string;
}

export interface CitizenReportResponse extends CitizenReportPayload {
  id: string;
  submitted_at: string;
  status: string;
}

export async function fetchHealth() {
  try {
    return await mobileRequest('/health');
  } catch (error) {
    console.warn("Mobile API health error:", error);
    return { status: "offline", model_loaded: false, stations: 0 };
  }
}

export async function fetchStationsList(): Promise<{ count: number; stations: string[] }> {
  try {
    return await mobileRequest('/stations');
  } catch (error) {
    console.warn("fetchStationsList error:", error);
    return { count: 0, stations: [] };
  }
}

export async function fetchStationDetails(stationName: string): Promise<StationPrediction | null> {
  try {
    return await mobileRequest(`/station/${encodeURIComponent(stationName)}`);
  } catch (error) {
    console.warn(`fetchStationDetails (${stationName}) error:`, error);
    return null;
  }
}

export async function submitReportToBackend(report: CitizenReportPayload) {
  const payload = { ...report, client_request_id: report.client_request_id || `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}` };
  try {
    return await mobileRequest('/reports', { method: 'POST', body: payload });
  } catch (error) {
    if (error instanceof Error && /^4\d\d:/.test(error.message)) return { success: false, offline: false, error: error.message };
    console.warn("submitReportToBackend failed (offline):", error);
    // Queue offline
    try {
      const queueStr = await AsyncStorage.getItem('offline_reports_queue');
      const queue = queueStr ? JSON.parse(queueStr) : [];
      if (!queue.some((r: CitizenReportPayload) => r.client_request_id === payload.client_request_id)) queue.push(payload);
      await AsyncStorage.setItem('offline_reports_queue', JSON.stringify(queue));
    } catch (e) {
      console.warn("Failed to queue report offline:", e);
    }
    return { success: false, offline: true };
  }
}

export async function syncOfflineReports() {
  try {
    const queueStr = await AsyncStorage.getItem('offline_reports_queue');
    if (!queueStr) return;
    const queue = JSON.parse(queueStr);
    if (queue.length === 0) return;
    
    const remainingQueue = [];
    for (const report of queue) report.client_request_id ||= `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await AsyncStorage.setItem('offline_reports_queue', JSON.stringify(queue));
    for (const report of queue) {
      try {
        await mobileRequest('/reports', { method: 'POST', body: report });
      } catch (e) {
        remainingQueue.push(report);
      }
    }
    await AsyncStorage.setItem('offline_reports_queue', JSON.stringify(remainingQueue));
  } catch (error) {
    console.warn("syncOfflineReports error:", error);
  }
}

export async function fetchAllReports(): Promise<CitizenReportResponse[]> {
  try {
    const data = await mobileRequest('/reports');
    return data.reports || [];
  } catch (error) {
    console.warn("fetchAllReports error:", error);
    return [];
  }
}

export async function fetchAlerts() {
  return (await fetchAlertsState()).alerts;
}

export async function fetchAlertsState(): Promise<{ alerts: any[]; source: string; fetchedAt: string | null }> {
  try {
    const data = await mobileRequest('/alerts');
    const alerts = (data.alerts || []).filter((alert: { status: string }) => alert.status === 'Active');
    const fetchedAt = new Date().toISOString();
    await AsyncStorage.setItem('cached_alerts_v2', JSON.stringify({ alerts, fetchedAt }));
    return { alerts, source: 'online', fetchedAt };
  } catch (error) {
    console.warn("fetchAlerts error, loading from cache:", error);
    try {
      const cachedStr = await AsyncStorage.getItem('cached_alerts_v2');
      const cached = cachedStr ? JSON.parse(cachedStr) : { alerts: [], fetchedAt: null };
      return { ...cached, source: 'offline cache; warnings may be revoked or stale' };
    } catch (e) {
      return { alerts: [], fetchedAt: null, source: 'offline; no cache available' };
    }
  }
}
