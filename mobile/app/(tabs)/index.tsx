import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Bell,
  MapPin,
  Navigation,
  TriangleAlert,
  Camera,
  ChevronRight,
  ShieldCheck,
  Siren,
  CloudRain,
  Activity,
  Home as HomeIcon,
  PhoneCall,
  Sparkles,
} from "lucide-react-native";
import { fetchStationDetails } from "@/services/api";
import { NEARBY_SHELTERS_DATA } from "@/constants/data";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [riskData, setRiskData] = useState({
    location: "Hanwella, Western Province",
    station: "Hanwella",
    riskLevel: "High" as "Low" | "Moderate" | "High" | "Very High",
    waterLevel: 4.61,
    predictedLevel: 4.85,
    rainfall: 18.6,
    lastUpdated: "5m ago",
    riverTrend: "Rising (Kelani Ganga)",
  });

  const loadData = async () => {
    setRefreshing(true);
    try {
      const data = await fetchStationDetails("Hanwella");
      if (data) {
        setRiskData((prev) => ({
          ...prev,
          station: data.station,
          riskLevel: data.risk_level,
          waterLevel: data.current_water_level,
          predictedLevel: data.predicted_water_level,
          rainfall: data.rainfall_12hr,
          lastUpdated: "Just now",
        }));
      }
    } catch (e) {
      console.warn("Failed to update home risk data:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case "Very High":
        return { bg: "#FEE2E2", text: "#DC2626", bar: "#EF4444" };
      case "High":
        return { bg: "#FFEDD5", text: "#EA580C", bar: "#F97316" };
      case "Moderate":
        return { bg: "#FEF9C3", text: "#CA8A04", bar: "#EAB308" };
      default:
        return { bg: "#DCFCE7", text: "#166534", bar: "#22C55E" };
    }
  };

  const badgeTheme = getRiskBadgeColor(riskData.riskLevel);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={["#2563EB"]} />
        }
      >
        {/* TOP APP HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>FloodSafe</Text>
            <Text style={styles.brandSubtitle}>Emergency Response & Warning System</Text>
          </View>

          <Pressable
            style={styles.notificationBtn}
            onPress={() => router.push("/(tabs)/alerts")}
          >
            <Bell size={20} color="#1E293B" />
            <View style={styles.badgeDot} />
          </Pressable>
        </View>

        {/* GREETING & GPS LOCATION BAR */}
        <View style={styles.greetingSection}>
          <View>
            <Text style={styles.greetingTitle}>Stay safe, Nuwan.</Text>
            <Text style={styles.greetingText}>
              Real-time monitoring for your surrounding area.
            </Text>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationIconBox}>
              <MapPin size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>CURRENT GPS LOCATION</Text>
              <Text style={styles.locationValue}>{riskData.location}</Text>
            </View>
            <Pressable style={styles.detectBadge} onPress={loadData}>
              <Navigation size={12} color="#2563EB" />
              <Text style={styles.detectText}>GPS Active</Text>
            </Pressable>
          </View>
        </View>

        {/* CURRENT FLOOD RISK WARNING CARD */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <View>
              <Text style={styles.riskLabel}>LOCATION RISK STATUS</Text>
              <Text style={styles.riskTitle}>{riskData.riskLevel} Risk</Text>
            </View>

            <View style={[styles.riskBadge, { backgroundColor: badgeTheme.bg }]}>
              <Text style={[styles.riskBadgeText, { color: badgeTheme.text }]}>
                {riskData.riskLevel.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.riskDescription}>
            Your current location is near a monitored flood-risk river basin. Water levels are expected to remain elevated over the next 24 hours.
          </Text>

          {/* Progress Indicator */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: badgeTheme.bar,
                  width:
                    riskData.riskLevel === "Very High"
                      ? "95%"
                      : riskData.riskLevel === "High"
                      ? "75%"
                      : riskData.riskLevel === "Moderate"
                      ? "50%"
                      : "25%",
                },
              ]}
            />
          </View>

          <View style={styles.riskFooter}>
            <Text style={styles.footerText}>Nearest station: {riskData.station}</Text>
            <Text style={styles.footerText}>Updated {riskData.lastUpdated}</Text>
          </View>
        </View>

        {/* ENVIRONMENTAL METRICS DUAL GRID */}
        <View style={styles.metricsGrid}>
          {/* Rainfall Metric */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: "#EFF6FF" }]}>
              <CloudRain size={20} color="#2563EB" />
            </View>
            <Text style={styles.metricLabel}>RAINFALL (24H)</Text>
            <Text style={styles.metricValue}>{riskData.rainfall} mm</Text>
            <Text style={styles.metricSubtext}>Heavy catchment rain</Text>
          </View>

          {/* River Trend Metric */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconBox, { backgroundColor: "#FEF3C7" }]}>
              <Activity size={20} color="#D97706" />
            </View>
            <Text style={styles.metricLabel}>RIVER TREND</Text>
            <Text style={[styles.metricValue, { fontSize: 15 }]}>Rising</Text>
            <Text style={styles.metricSubtext}>{riskData.station} station</Text>
          </View>
        </View>

        {/* PROMINENT EMERGENCY SOS BUTTON */}
        <Pressable
          style={styles.sosBanner}
          onPress={() => router.push("/sos")}
        >
          <View style={styles.sosIconCircle}>
            <Siren size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>REQUEST EMERGENCY SOS</Text>
            <Text style={styles.sosSubtitle}>Instant alert to DMC Response Hotline (117)</Text>
          </View>
          <ChevronRight size={20} color="#FFFFFF" />
        </Pressable>

        {/* QUICK ACTIONS ROW */}
        <Text style={styles.sectionHeading}>Need Assistance?</Text>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionBtn, styles.actionPrimary]}
            onPress={() => router.push("/(tabs)/report")}
          >
            <View style={styles.actionIconPrimary}>
              <Camera size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitlePrimary}>Report Flooding</Text>
            <Text style={styles.actionSubtitlePrimary}>Submit photos & GPS</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, styles.actionSecondary]}
            onPress={() => router.push("/(tabs)/alerts")}
          >
            <View style={styles.actionIconSecondary}>
              <TriangleAlert size={22} color="#2563EB" />
            </View>
            <Text style={styles.actionTitleSecondary}>Official Warnings</Text>
            <Text style={styles.actionSubtitleSecondary}>View active alerts</Text>
          </Pressable>
        </View>

        {/* NEARBY SHELTERS SUMMARY */}
        <View style={styles.shelterSection}>
          <View style={styles.shelterHeader}>
            <Text style={styles.sectionHeadingMarginless}>Nearby Emergency Shelters</Text>
            <Pressable onPress={() => router.push("/(tabs)/map")}>
              <Text style={styles.linkText}>View Map</Text>
            </Pressable>
          </View>

          {NEARBY_SHELTERS_DATA.slice(0, 2).map((shelter) => (
            <View key={shelter.id} style={styles.shelterCard}>
              <View style={styles.shelterIconBox}>
                <HomeIcon size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shelterName}>{shelter.name}</Text>
                <Text style={styles.shelterMeta}>
                  {shelter.distanceKm} km away • {shelter.capacity - shelter.occupancy} spots available
                </Text>
              </View>
              <Pressable
                style={styles.directionsBtn}
                onPress={() => router.push("/(tabs)/map")}
              >
                <Text style={styles.directionsText}>Locate</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* SAFETY ADVISORY FOOTER */}
        <View style={styles.safetyFooter}>
          <ShieldCheck size={20} color="#15803D" />
          <Text style={styles.safetyText}>
            Follow official DMC instructions. Avoid driving or walking through moving floodwaters.
          </Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  badgeDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  greetingSection: {
    marginTop: 20,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
  },
  greetingText: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  locationLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  locationValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 1,
  },
  detectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detectText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  riskCard: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  riskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  riskLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  riskTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  riskDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
    marginTop: 10,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    marginTop: 14,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  riskFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  footerText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  metricSubtext: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  sosBanner: {
    marginTop: 18,
    backgroundColor: "#DC2626",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sosIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  sosTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  sosSubtitle: {
    fontSize: 11,
    color: "#FEE2E2",
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 22,
    marginBottom: 12,
  },
  sectionHeadingMarginless: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    justifyContent: "space-between",
  },
  actionPrimary: {
    backgroundColor: "#2563EB",
  },
  actionSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionIconPrimary: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionIconSecondary: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  actionTitlePrimary: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  actionSubtitlePrimary: {
    fontSize: 10,
    color: "#DBEAFE",
  },
  actionTitleSecondary: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  actionSubtitleSecondary: {
    fontSize: 10,
    color: "#64748B",
  },
  shelterSection: {
    marginTop: 22,
  },
  shelterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  shelterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  shelterIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  shelterName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  shelterMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  directionsBtn: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  directionsText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  safetyFooter: {
    marginTop: 18,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 10,
  },
  safetyText: {
    flex: 1,
    fontSize: 11,
    color: "#166534",
    lineHeight: 16,
  },
});
