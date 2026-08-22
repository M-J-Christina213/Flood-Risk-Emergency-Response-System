import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  TouchableOpacity
} from "react-native";
import { useRouter } from "expo-router";
import { Bell, MapPin, Camera, TriangleAlert } from "lucide-react-native";
import { fetchStationDetails } from "@/services/api";
import { NEARBY_SHELTERS_DATA } from "@/constants/data";
import { Colors } from "@/constants/theme";
import { RiskCard, RiskLevel } from "@/components/RiskCard";
import { ConditionCard } from "@/components/ConditionCard";
import { ShelterCard } from "@/components/ShelterCard";
import { CloudRain, Activity } from "lucide-react-native";

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[Colors.primary]} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingTitle}>Good morning, Nuwan</Text>
            <View style={styles.locationContainer}>
              <MapPin size={16} color={Colors.primary} />
              <Text style={styles.locationText}>{riskData.location}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => router.push("/(tabs)/alerts")}
          >
            <Bell size={24} color={Colors.text} />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Flood Risk</Text>
          <RiskCard 
            level={riskData.riskLevel}
            message="Flood risk is elevated near your current location. Please remain alert."
            updatedTime={riskData.lastUpdated}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Conditions</Text>
          <View style={styles.row}>
            <ConditionCard 
              title="Rainfall"
              value={`${riskData.rainfall} mm`}
              Icon={CloudRain}
            />
            <View style={{ width: 12 }} />
            <ConditionCard 
              title="River Level"
              value={`${riskData.waterLevel} m`}
              subtitle={`↑ ${riskData.riverTrend}`}
              subtitleColor={Colors.emergency}
              Icon={Activity}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionPrimary]}
              onPress={() => router.push("/(tabs)/report")}
            >
              <Camera size={24} color={Colors.surface} />
              <Text style={styles.actionTitlePrimary}>Report Flood</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionEmergency]}
              onPress={() => router.push("/sos")}
            >
              <TriangleAlert size={24} color={Colors.surface} />
              <Text style={styles.actionTitlePrimary}>SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Shelters</Text>
          {NEARBY_SHELTERS_DATA.slice(0, 3).map((shelter) => (
            <ShelterCard 
              key={shelter.id}
              name={shelter.name}
              distance={`${shelter.distanceKm} km`}
              availability={shelter.capacity - shelter.occupancy > 20 ? 'HIGH' : shelter.capacity - shelter.occupancy > 0 ? 'LOW' : 'FULL'}
              onPress={() => router.push("/(tabs)/map")}
            />
          ))}
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  notificationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.emergency,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 16,
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
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
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
});
