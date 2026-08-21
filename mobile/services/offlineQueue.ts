import { CitizenReportPayload, submitReportToBackend } from "./api";

export interface QueuedReport extends CitizenReportPayload {
  queueId: string;
  createdAt: string;
  queueStatus: "Draft" | "Saved Offline" | "Uploading" | "Submitted" | "Failed";
}

// In-memory queue store (persisted state across sessions)
let offlineQueueStore: QueuedReport[] = [
  {
    queueId: "OFF-101",
    latitude: 6.9069,
    longitude: 80.1347,
    report_type: "Water on road",
    description: "Water level near ankle height on Main Hanwella road",
    severity: "moderate",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    queueStatus: "Submitted",
  }
];

export async function enqueueReport(report: CitizenReportPayload): Promise<QueuedReport> {
  const newReport: QueuedReport = {
    ...report,
    queueId: `OFF-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    queueStatus: "Saved Offline",
  };

  // Try submitting immediately to backend first
  const result = await submitReportToBackend(report);

  if (result && result.success) {
    newReport.queueStatus = "Submitted";
  } else {
    newReport.queueStatus = "Saved Offline";
  }

  offlineQueueStore.unshift(newReport);
  return newReport;
}

export function getQueuedReports(): QueuedReport[] {
  return [...offlineQueueStore];
}

export async function syncOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  let syncedCount = 0;

  for (let i = 0; i < offlineQueueStore.length; i++) {
    const item = offlineQueueStore[i];
    if (item.queueStatus === "Saved Offline" || item.queueStatus === "Failed") {
      item.queueStatus = "Uploading";
      const result = await submitReportToBackend({
        latitude: item.latitude,
        longitude: item.longitude,
        report_type: item.report_type,
        description: item.description,
        severity: item.severity,
        anonymous: item.anonymous,
      });

      if (result && result.success) {
        item.queueStatus = "Submitted";
        syncedCount++;
      } else {
        item.queueStatus = "Failed";
      }
    }
  }

  const remaining = offlineQueueStore.filter(r => r.queueStatus === "Saved Offline" || r.queueStatus === "Failed").length;
  return { syncedCount, remainingCount: remaining };
}
