import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ImageBackground
} from "react-native";
import { useRouter } from "expo-router";
import { Bell, MapPin, Camera, TriangleAlert, CloudRain, Activity, ShieldAlert, Waves } from "lucide-react-native";
import { fetchStationDetails } from "@/services/api";
import { NEARBY_SHELTERS_DATA } from "@/constants/data";
import { Colors } from "@/constants/theme";
import { RiskCard, RiskLevel } from "@/components/RiskCard";
import { ConditionCard } from "@/components/ConditionCard";
import { ShelterCard } from "@/components/ShelterCard";

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [riskData, setRiskData] = useState({
    location: "Hanwella, Western Province",
    station: "Hanwella",
    riskLevel: "HIGH" as RiskLevel,
    waterLevel: 4.61,
    predictedLevel: 4.85,
    rainfall: 18.6,
    lastUpdated: "5m ago",
    riverTrend: "Rising",
  });

  const loadData = async () => {
    setRefreshing(true);
    try {
      const data = await fetchStationDetails("Hanwella");
      if (data) {
        setRiskData((prev) => ({
          ...prev,
          station: data.station,
          riskLevel: data.risk_level.toUpperCase().replace(' ', '_') as RiskLevel,
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

  const getRiskColor = (level: string) => {
    if (level.includes('HIGH')) return Colors.emergency || '#ef4444';
    if (level.includes('MODERATE')) return Colors.warning || '#f59e0b';
    return Colors.safe || '#10b981';
  };

  const riskColor = getRiskColor(riskData.riskLevel);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[Colors.primary]} />
        }
      >
        {/* HERO SECTION */}
        <View style={[styles.heroSection, { backgroundColor: riskColor }]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.greetingTitle}>Sri Lanka Flood Monitor</Text>
              <View style={styles.locationContainer}>
                <MapPin size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.locationText}>{riskData.location}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => router.push("/(tabs)/alerts")}
            >
              <Bell size={24} color="#fff" />
              <View style={styles.badgeDot} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroMain}>
            <View style={styles.riskBadge}>
              <ShieldAlert size={20} color={riskColor} />
              <Text style={[styles.riskBadgeText, { color: riskColor }]}>
                {riskData.riskLevel} RISK
              </Text>
            </View>
            <Text style={styles.waterLevelText}>{riskData.waterLevel}m</Text>
            <Text style={styles.waterLevelSub}>Current River Level</Text>
            
            <View style={styles.predictionBox}>
              <Waves size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.predictionText}>
                Predicted to reach <Text style={{fontWeight: "bold"}}>{riskData.predictedLevel}m</Text> soon
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* CONDITIONS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Local Conditions</Text>
            <View style={styles.row}>
              <ConditionCard 
                title="Rainfall (12h)"
                value={`${riskData.rainfall} mm`}
                Icon={CloudRain}
              />
              <View style={{ width: 12 }} />
              <ConditionCard 
                title="River Trend"
                value={`${riskData.riverTrend}`}
                subtitle={`Updated ${riskData.lastUpdated}`}
                subtitleColor={Colors.textSecondary}
                Icon={Activity}
              />
            </View>
          </View>

          {/* QUICK ACTIONS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Actions</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => router.push("/(tabs)/report")}
              >
                <Camera size={28} color={Colors.surface} />
                <Text style={styles.actionTitlePrimary}>Report Flood</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionEmergency]}
                onPress={() => router.push("/sos")}
              >
                <TriangleAlert size={28} color={Colors.surface} />
                <Text style={styles.actionTitlePrimary}>SOS Alert</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SHELTERS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nearest Safe Shelters</Text>
            {NEARBY_SHELTERS_DATA.slice(0, 3).map((shelter) => (
              <ShelterCard 
                key={shelter.id}
                name={shelter.name}
                distance={`${shelter.distanceKm} km`}
                availability={shelter.capacity - shelter.occupancy > 20 ? 'HIGH' : shelter.capacity - shelter.occupancy > 0 ? 'LOW' : 'FULL'}
                onPress={() => router.push("/(tabs)/map")}
              />
            ))}
            <TouchableOpacity style={styles.viewMapBtn} onPress={() => router.push("/(tabs)/map")}>
              <Text style={styles.viewMapText}>View All on Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeDot: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ffeb3b",
    borderWidth: 2,
    borderColor: Colors.emergency,
  },
  heroMain: {
    alignItems: "center",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  riskBadgeText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  waterLevelText: {
    fontSize: 64,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 70,
  },
  waterLevelSub: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginBottom: 24,
  },
  predictionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  predictionText: {
    color: "#fff",
    fontSize: 15,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  row: {
    flexDirection: "row",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 20,
    padding: 24,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionPrimary: {
    backgroundColor: Colors.primary,
  },
  actionEmergency: {
    backgroundColor: Colors.emergency,
  },
  actionTitlePrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.surface,
  },
  viewMapBtn: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  viewMapText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  }
});
