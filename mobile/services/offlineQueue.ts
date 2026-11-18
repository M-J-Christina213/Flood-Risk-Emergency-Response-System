// Compatibility facade: all retry storage lives in api.ts / AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CitizenReportPayload, submitReportToBackend, syncOfflineReports } from './api';
export async function enqueueReport(report: CitizenReportPayload) { return submitReportToBackend(report); }
export async function getQueuedReports(): Promise<CitizenReportPayload[]> {
  return JSON.parse(await AsyncStorage.getItem('offline_reports_queue') || '[]');
}
export async function syncOfflineQueue() {
  const before = (await getQueuedReports()).length;
  await syncOfflineReports();
  const remainingCount = (await getQueuedReports()).length;
  return { syncedCount: Math.max(0, before - remainingCount), remainingCount };
}
