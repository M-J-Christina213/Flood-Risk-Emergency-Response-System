// API Base URL for Mobile Application
// Uses localhost / 127.0.0.1 for local dev/simulator, customizable for device testing
const API_BASE_URL = "http://127.0.0.1:8000";

export interface StationPrediction {
  station: string;
  datetime?: string;
  river?: string | null;
  river_basin?: string | null;
  current_water_level: number;
  predicted_water_level: number;
  rainfall_12hr: number;
  risk_level: "Low" | "Moderate" | "High" | "Very High";
  alert_level?: number | null;
  minor_flood_level?: number | null;
  major_flood_level?: number | null;
  model?: string;
  model_version?: string;
  prediction_generated_at?: string;
}


export interface CitizenReportPayload {
  latitude: number;
  longitude: number;
  report_type: string;
  description: string;
  severity: "minor" | "moderate" | "severe" | "critical";
  anonymous?: boolean;
}

export interface CitizenReportResponse extends CitizenReportPayload {
  id: string;
  submitted_at: string;
  status: string;
}

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error("API health check failed");
    return await res.json();
  } catch (error) {
    console.warn("Mobile API health error:", error);
    return { status: "offline", model_loaded: false, stations: 0 };
  }
}

export async function fetchStationsList(): Promise<{ count: number; stations: string[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/stations`);
    if (!res.ok) throw new Error("Failed to fetch stations");
    return await res.json();
  } catch (error) {
    console.warn("fetchStationsList error:", error);
    return { count: 0, stations: [] };
  }
}

export async function fetchStationDetails(stationName: string): Promise<StationPrediction | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/station/${encodeURIComponent(stationName)}`);
    if (!res.ok) throw new Error(`Station ${stationName} fetch failed`);
    return await res.json();
  } catch (error) {
    console.warn(`fetchStationDetails (${stationName}) error:`, error);
    return null;
  }
}

export async function submitReportToBackend(report: CitizenReportPayload) {
  try {
    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    if (!res.ok) throw new Error("Failed to submit report");
    return await res.json();
  } catch (error) {
    console.warn("submitReportToBackend failed (offline):", error);
    return { success: false, offline: true };
  }
}

export async function fetchAllReports(): Promise<CitizenReportResponse[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/reports`);
    if (!res.ok) throw new Error("Failed to fetch reports");
    const data = await res.json();
    return data.reports || [];
  } catch (error) {
    console.warn("fetchAllReports error:", error);
    return [];
  }
}
