import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import {
  Camera,
  MapPin,
  Send,
  WifiOff,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react-native";
import { enqueueReport, getQueuedReports, syncOfflineQueue, QueuedReport } from "@/services/offlineQueue";

const OBSERVATION_TYPES = [
  "Water on road",
  "Road completely flooded",
  "Water entering house/building",
  "Vehicle stranded",
  "People need assistance",
  "Bridge/road damaged",
  "Other",
];

const DEPTH_LEVELS = [
  "Below ankle (<10cm)",
  "Ankle to knee (10-40cm)",
  "Knee to waist (40-90cm)",
  "Above waist (>90cm)",
];

export default function ReportScreen() {
  const [selectedType, setSelectedType] = useState<string>(OBSERVATION_TYPES[0]);
  const [selectedDepth, setSelectedDepth] = useState<string>(DEPTH_LEVELS[1]);
  const [severity, setSeverity] = useState<"minor" | "moderate" | "severe" | "critical">("moderate");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [queue, setQueue] = useState<QueuedReport[]>(getQueuedReports());
  const [syncing, setSyncing] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const fullDescription = `[Depth: ${selectedDepth}] ${description}`.trim();
      const reportItem = await enqueueReport({
        latitude: 6.9069,
        longitude: 80.1347,
        report_type: selectedType,
        description: fullDescription,
        severity: severity,
        anonymous: true,
      });

      setQueue(getQueuedReports());
      setDescription("");
      
      Alert.alert(
        reportItem.queueStatus === "Submitted" ? "Report Submitted" : "Saved Offline",
        reportItem.queueStatus === "Submitted"
          ? "Thank you. Your flood report has been received by DMC authorities."
          : "Network unavailable. Your report has been saved locally and queued for automatic upload."
      );
    } catch (e) {
      console.warn("Report submit error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncQueue = async () => {
    setSyncing(true);
    try {
      const res = await syncOfflineQueue();
      setQueue(getQueuedReports());
      Alert.alert(
        "Offline Sync Complete",
        `Successfully synced ${res.syncedCount} offline reports with DMC server.`
      );
    } catch (e) {
      console.warn("Sync error:", e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Report Flooding</Text>
          <Text style={styles.subtitle}>
            Help emergency responders by sharing observed conditions in your area.
          </Text>
        </View>

        {/* GPS LOCATION AUTOMATIC CARD */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsIconBox}>
            <MapPin size={20} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gpsLabel}>CAPTURED GPS COORDINATES</Text>
            <Text style={styles.gpsValue}>6.9069° N, 80.1347° E (Hanwella)</Text>
          </View>
          <View style={styles.autoBadge}>
            <Text style={styles.autoText}>Auto Location</Text>
          </View>
        </View>

        {/* SECTION 1: WHAT ARE YOU OBSERVING */}
        <Text style={styles.sectionTitle}>1. What are you seeing?</Text>
        <View style={styles.optionsGrid}>
          {OBSERVATION_TYPES.map((type) => {
            const isSelected = selectedType === type;
            return (
              <Pressable
                key={type}
                style={[styles.optionChip, isSelected && styles.optionChipActive]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* SECTION 2: ESTIMATED WATER DEPTH */}
        <Text style={styles.sectionTitle}>2. Estimated Water Depth</Text>
        <View style={styles.depthList}>
          {DEPTH_LEVELS.map((depth) => {
            const isSelected = selectedDepth === depth;
            return (
              <Pressable
                key={depth}
                style={[styles.depthCard, isSelected && styles.depthCardActive]}
                onPress={() => setSelectedDepth(depth)}
              >
                <View
                  style={[styles.radioCircle, isSelected && styles.radioCircleActive]}
                />
                <Text style={[styles.depthText, isSelected && styles.depthTextActive]}>
                  {depth}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* SECTION 3: SEVERITY LEVEL */}
        <Text style={styles.sectionTitle}>3. Incident Severity</Text>
        <View style={styles.severityRow}>
          {(["minor", "moderate", "severe", "critical"] as const).map((sev) => {
            const isSelected = severity === sev;
            return (
              <Pressable
                key={sev}
                style={[
                  styles.sevBtn,
                  isSelected && {
                    backgroundColor:
                      sev === "critical"
                        ? "#DC2626"
                        : sev === "severe"
                        ? "#EA580C"
                        : sev === "moderate"
                        ? "#EAB308"
                        : "#22C55E",
                  },
                ]}
                onPress={() => setSeverity(sev)}
              >
                <Text
                  style={[
                    styles.sevText,
                    isSelected && { color: "#FFFFFF", fontWeight: "900" },
                  ]}
                >
                  {sev.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* SECTION 4: DESCRIPTION */}
        <Text style={styles.sectionTitle}>4. Optional Details</Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={3}
          placeholder="Add landmark, road name, or trapped vehicle details..."
          placeholderTextColor="#94A3B8"
          value={description}
          onChangeText={setDescription}
        />

        {/* SUBMIT BUTTON */}
        <Pressable
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Send size={20} color="#FFFFFF" />
          <Text style={styles.submitText}>
            {submitting ? "Submitting Report..." : "Submit Flood Report"}
          </Text>
        </Pressable>

        {/* OFFLINE QUEUE STATUS & SYNC PANEL */}
        <View style={styles.queueContainer}>
          <View style={styles.queueHeader}>
            <View style={styles.queueHeaderTitle}>
              <WifiOff size={18} color="#64748B" />
              <Text style={styles.queueHeading}>Offline Report Queue</Text>
            </View>
            <Pressable style={styles.syncBtn} onPress={handleSyncQueue} disabled={syncing}>
              <RefreshCw size={14} color="#2563EB" />
              <Text style={styles.syncText}>{syncing ? "Syncing..." : "Sync Queue"}</Text>
            </Pressable>
          </View>

          {queue.length === 0 ? (
            <Text style={styles.emptyQueueText}>No offline reports waiting to sync.</Text>
          ) : (
            queue.map((item) => (
              <View key={item.queueId} style={styles.queueItemCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.qType}>{item.report_type}</Text>
                  <Text style={styles.qDate}>Created: {new Date(item.createdAt).toLocaleTimeString()}</Text>
                </View>
                <View
                  style={[
                    styles.qBadge,
                    {
                      backgroundColor:
                        item.queueStatus === "Submitted"
                          ? "#DCFCE7"
                          : item.queueStatus === "Saved Offline"
                          ? "#FEF9C3"
                          : "#FEE2E2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.qBadgeText,
                      {
                        color:
                          item.queueStatus === "Submitted"
                            ? "#166534"
                            : item.queueStatus === "Saved Offline"
                            ? "#CA8A04"
                            : "#DC2626",
                      },
                    ]}
                  >
                    {item.queueStatus}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 18,
  },
  gpsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
    marginBottom: 20,
  },
  gpsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  gpsLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
  },
  gpsValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  autoBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autoText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 16,
    marginBottom: 10,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  optionChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  optionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
  depthList: {
    gap: 8,
  },
  depthCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  depthCardActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#CBD5E1",
  },
  radioCircleActive: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB",
  },
  depthText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  depthTextActive: {
    color: "#2563EB",
  },
  severityRow: {
    flexDirection: "row",
    gap: 8,
  },
  sevBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  sevText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    fontSize: 13,
    color: "#0F172A",
    textAlignVertical: "top",
    minHeight: 80,
  },
  submitBtn: {
    marginTop: 22,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    elevation: 3,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  queueContainer: {
    marginTop: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  queueHeaderTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  queueHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  syncText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  emptyQueueText: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 10,
  },
  queueItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  qType: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  qDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  qBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
});
