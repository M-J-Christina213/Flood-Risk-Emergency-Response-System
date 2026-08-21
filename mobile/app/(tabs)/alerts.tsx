import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import {
  Bell,
  AlertTriangle,
  Info,
  ShieldAlert,
  ChevronRight,
  ShieldCheck,
} from "lucide-react-native";
import { OFFICIAL_ALERTS_DATA } from "@/constants/data";

export default function AlertsScreen() {
  const [filterSeverity, setFilterSeverity] = useState<"All" | "Critical" | "Warning" | "Information">("All");

  const filteredAlerts = OFFICIAL_ALERTS_DATA.filter(
    (item) => filterSeverity === "All" || item.severity === filterSeverity
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Emergency Warnings</Text>
          <Text style={styles.subtitle}>
            Official broadcasts from Disaster Management Center (DMC Sri Lanka).
          </Text>
        </View>

        {/* SEVERITY FILTER TABS */}
        <View style={styles.filterRow}>
          {(["All", "Critical", "Warning", "Information"] as const).map((sev) => {
            const isSelected = filterSeverity === sev;
            return (
              <Pressable
                key={sev}
                style={[styles.filterTab, isSelected && styles.filterTabActive]}
                onPress={() => setFilterSeverity(sev)}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                  {sev}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ALERTS LIST */}
        <View style={styles.alertsList}>
          {filteredAlerts.length === 0 ? (
            <View style={styles.emptyBox}>
              <ShieldCheck size={36} color="#166534" />
              <Text style={styles.emptyTitle}>No Active Alerts</Text>
              <Text style={styles.emptySub}>No warnings found for selected severity level.</Text>
            </View>
          ) : (
            filteredAlerts.map((alert) => {
              const isCritical = alert.severity === "Critical";
              const isWarning = alert.severity === "Warning";

              return (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    isCritical && styles.cardCritical,
                    isWarning && styles.cardWarning,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: isCritical
                            ? "#FEE2E2"
                            : isWarning
                            ? "#FFEDD5"
                            : "#EFF6FF",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: isCritical
                              ? "#DC2626"
                              : isWarning
                              ? "#EA580C"
                              : "#2563EB",
                          },
                        ]}
                      >
                        {alert.severity.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{alert.timeAgo}</Text>
                  </View>

                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertMeta}>
                    Area: {alert.location} • Station: {alert.station}
                  </Text>

                  <Text style={styles.alertMessage}>{alert.message}</Text>

                  {/* RECOMMENDED CITIZEN ACTION BOX */}
                  <View style={styles.actionAdviceBox}>
                    <ShieldAlert size={16} color="#1E293B" />
                    <Text style={styles.adviceText}>{alert.actionAdvice}</Text>
                  </View>
                </View>
              );
            })
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterTabActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  alertsList: {
    gap: 14,
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  cardCritical: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  cardWarning: {
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  timeText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 10,
  },
  alertMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  alertMessage: {
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
    marginTop: 8,
  },
  actionAdviceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  adviceText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
  },
  emptyBox: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#166534",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 4,
  },
});
