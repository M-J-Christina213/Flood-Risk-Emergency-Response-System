import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ImageBackground,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Bell, MapPin, Camera, TriangleAlert, CloudRain, Activity, ShieldAlert, Waves, ArrowRight } from "lucide-react-native";
import { fetchStationDetails } from "@/services/api";
import { NEARBY_SHELTERS_DATA } from "@/constants/data";
import { Colors } from "@/constants/theme";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [riskData, setRiskData] = useState({
    location: "Hanwella, Western Province",
    station: "Hanwella",
    riskLevel: "HIGH" as any,
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
          riskLevel: data.risk_level.toUpperCase().replace(' ', '_'),
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
    if (level.includes('HIGH')) return ['#ff4b4b', '#d32f2f']; // Vibrant Red Gradient
    if (level.includes('MODERATE')) return ['#f59e0b', '#d97706']; // Amber Gradient
    return ['#10b981', '#059669']; // Emerald Gradient
  };

  const riskGradient = getRiskColor(riskData.riskLevel);
  const primaryColor = riskGradient[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[primaryColor]} tintColor={primaryColor} />
        }
      >
        {/* PREMIUM HERO SECTION */}
        <View style={[styles.heroSection, { backgroundColor: primaryColor }]}>
          {/* Glassmorphism subtle overlay */}
          <View style={styles.heroOverlay} />
          
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.greetingTitle}>Flood Monitor Sri Lanka</Text>
              <View style={styles.locationContainer}>
                <MapPin size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.locationText}>{riskData.location}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => router.push("/(tabs)/alerts")}
            >
              <Bell size={22} color="#fff" />
              {riskData.riskLevel.includes('HIGH') && <View style={styles.badgeDot} />}
            </TouchableOpacity>
          </View>

          <View style={styles.heroMain}>
            <View style={styles.riskBadge}>
              <ShieldAlert size={18} color={primaryColor} />
              <Text style={[styles.riskBadgeText, { color: primaryColor }]}>
                {riskData.riskLevel.replace('_', ' ')} RISK
              </Text>
            </View>
            
            <View style={styles.waterLevelContainer}>
              <Text style={styles.waterLevelText}>{riskData.waterLevel}</Text>
              <Text style={styles.waterLevelUnit}>m</Text>
            </View>
            <Text style={styles.waterLevelSub}>Current River Level at {riskData.station}</Text>
            
            <View style={styles.predictionBox}>
              <Waves size={20} color="rgba(255,255,255,0.9)" />
              <View style={styles.predictionTextContainer}>
                <Text style={styles.predictionTextLabel}>ML Predicted Level (Next 12h)</Text>
                <Text style={styles.predictionTextValue}>{riskData.predictedLevel}m</Text>
              </View>
              <Activity size={20} color="rgba(255,255,255,0.5)" />
            </View>
          </View>
        </View>

        <View style={styles.content}>
          
          {/* CONDITIONS - PREMIUM CARDS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Local Conditions</Text>
            <View style={styles.row}>
              <View style={styles.conditionCard}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <CloudRain size={24} color="#3b82f6" />
                </View>
                <Text style={styles.conditionTitle}>Rainfall (12h)</Text>
                <Text style={styles.conditionValue}>{riskData.rainfall} mm</Text>
              </View>
              
              <View style={styles.conditionCard}>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Activity size={24} color="#8b5cf6" />
                </View>
                <Text style={styles.conditionTitle}>River Trend</Text>
                <Text style={styles.conditionValue}>{riskData.riverTrend}</Text>
                <Text style={styles.conditionSubtitle}>Updated {riskData.lastUpdated}</Text>
              </View>
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
                <View style={styles.actionIconContainer}>
                  <Camera size={24} color={Colors.primary} />
                </View>
                <Text style={styles.actionTitle}>Report Flood</Text>
                <Text style={styles.actionSub}>Send photo evidence</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionEmergency]}
                onPress={() => router.push("/sos")}
              >
                <View style={styles.actionIconContainerRed}>
                  <TriangleAlert size={24} color="#fff" />
                </View>
                <Text style={[styles.actionTitle, { color: '#fff' }]}>SOS Alert</Text>
                <Text style={[styles.actionSub, { color: 'rgba(255,255,255,0.8)' }]}>Request rescue</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SHELTERS - SLEEK LIST */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Nearest Safe Shelters</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/map")}>
                <Text style={styles.viewAllText}>Map View</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.shelterList}>
              {NEARBY_SHELTERS_DATA.slice(0, 3).map((shelter, index) => {
                const availability = shelter.capacity - shelter.occupancy > 20 ? 'HIGH' : shelter.capacity - shelter.occupancy > 0 ? 'LOW' : 'FULL';
                const availColor = availability === 'HIGH' ? '#10b981' : availability === 'LOW' ? '#f59e0b' : '#ef4444';
                
                return (
                  <TouchableOpacity key={shelter.id} style={[styles.shelterItem, index !== 2 && styles.shelterItemBorder]}>
                    <View style={styles.shelterIcon}>
                      <MapPin size={20} color={Colors.textSecondary} />
                    </View>
                    <View style={styles.shelterInfo}>
                      <Text style={styles.shelterName} numberOfLines={1}>{shelter.name}</Text>
                      <Text style={styles.shelterDistance}>{shelter.distanceKm} km away</Text>
                    </View>
                    <View style={[styles.availabilityBadge, { backgroundColor: `${availColor}15` }]}>
                      <Text style={[styles.availabilityText, { color: availColor }]}>{availability}</Text>
                    </View>
                    <ArrowRight size={16} color={Colors.textTertiary} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          
          <View style={styles.footerSpace} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
    zIndex: 10,
  },
  greetingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "800",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  badgeDot: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ffeb3b",
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  heroMain: {
    alignItems: "center",
    zIndex: 10,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    marginBottom: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  riskBadgeText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  waterLevelContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  waterLevelText: {
    fontSize: 72,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 80,
    letterSpacing: -2,
  },
  waterLevelUnit: {
    fontSize: 24,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
    marginLeft: 4,
  },
  waterLevelSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    marginBottom: 28,
  },
  predictionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    width: "100%",
    backdropFilter: "blur(10px)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  predictionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  predictionTextLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  predictionTextValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  content: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e293b",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  conditionCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  conditionTitle: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
    marginBottom: 4,
  },
  conditionValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  conditionSubtitle: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 16,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    justifyContent: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  actionPrimary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  actionEmergency: {
    backgroundColor: "#ef4444",
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  actionIconContainerRed: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  shelterList: {
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  shelterItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  shelterItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  shelterIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  shelterInfo: {
    flex: 1,
  },
  shelterName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  shelterDistance: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: "800",
  },
  footerSpace: {
    height: 40,
  }
});

