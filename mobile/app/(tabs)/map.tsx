import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import {
  MapPin,
  Navigation,
  Layers,
  Filter,
  Info,
  ChevronRight,
  ShieldCheck,
  Activity,
  Home as HomeIcon,
  TriangleAlert,
  Search,
} from "lucide-react-native";
import { fetchStationsList, fetchStationDetails, StationPrediction } from "@/services/api";
import { NEARBY_SHELTERS_DATA } from "@/constants/data";

const { width } = Dimensions.get("window");

export default function MapScreen() {
  const [filter, setFilter] = useState<"all" | "stations" | "shelters" | "reports">("all");
  const [stations, setStations] = useState<StationPrediction[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMapData() {
      setLoading(true);
      try {
        const list = await fetchStationsList();
        const detailPromises = (list.stations || []).slice(0, 10).map((name) => fetchStationDetails(name));
        const results = await Promise.all(detailPromises);
        const validStations = results.filter((s): s is StationPrediction => s !== null);
        setStations(validStations);
        if (validStations.length > 0) {
          setSelectedItem(validStations[0]);
        }
      } catch (e) {
        console.warn("Map data load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadMapData();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER & FILTER BAR */}
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>GIS Flood Risk Map</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <Pressable
              style={[styles.filterChip, filter === "all" && styles.filterChipActive]}
              onPress={() => setFilter("all")}
            >
              <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
                All Layers
              </Text>
            </Pressable>

            <Pressable
              style={[styles.filterChip, filter === "stations" && styles.filterChipActive]}
              onPress={() => setFilter("stations")}
            >
              <Text style={[styles.filterText, filter === "stations" && styles.filterTextActive]}>
                River Stations
              </Text>
            </Pressable>

            <Pressable
              style={[styles.filterChip, filter === "shelters" && styles.filterChipActive]}
              onPress={() => setFilter("shelters")}
            >
              <Text style={[styles.filterText, filter === "shelters" && styles.filterTextActive]}>
                Shelters
              </Text>
            </Pressable>

            <Pressable
              style={[styles.filterChip, filter === "reports" && styles.filterChipActive]}
              onPress={() => setFilter("reports")}
            >
              <Text style={[styles.filterText, filter === "reports" && styles.filterTextActive]}>
                Incident Reports
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* MAP CANVAS VIEW */}
        <View style={styles.mapCanvasContainer}>
          {/* Simulated Geographic Grid Lines */}
          <View style={styles.gridOverlay} />

          {/* Road vector simulation */}
          <View style={styles.roadOne} />
          <View style={styles.roadTwo} />

          {/* User Marker */}
          <View style={styles.userMarkerPosition}>
            <View style={styles.pulseRing} />
            <View style={styles.userDotCircle}>
              <Navigation size={14} color="#FFFFFF" />
            </View>
            <View style={styles.userLabelBadge}>
              <Text style={styles.userLabelText}>You (Colombo)</Text>
            </View>
          </View>

          {/* Station Markers */}
          {(filter === "all" || filter === "stations") &&
            stations.map((st, index) => {
              const positions = [
                { top: "25%", left: "65%" },
                { top: "42%", left: "78%" },
                { top: "60%", left: "30%" },
                { top: "75%", left: "55%" },
                { top: "35%", left: "20%" },
              ];
              const pos = positions[index % positions.length] as any;
              const isSelected = selectedItem?.station === st.station;

              let color = "#22C55E";
              if (st.risk_level === "Moderate") color = "#EAB308";
              if (st.risk_level === "High") color = "#F97316";
              if (st.risk_level === "Very High") color = "#EF4444";

              return (
                <Pressable
                  key={st.station}
                  style={[styles.stationPin, pos, isSelected && styles.stationPinSelected]}
                  onPress={() => setSelectedItem(st)}
                >
                  <View style={[styles.pinInnerCircle, { backgroundColor: color }]} />
                  <Text style={styles.pinText}>{st.station}</Text>
                </Pressable>
              );
            })}

          {/* Shelter Pins */}
          {(filter === "all" || filter === "shelters") && (
            <Pressable
              style={[styles.shelterPin, { top: "50%", left: "40%" }]}
              onPress={() =>
                setSelectedItem({
                  type: "shelter",
                  name: NEARBY_SHELTERS_DATA[0].name,
                  capacity: NEARBY_SHELTERS_DATA[0].capacity,
                  occupancy: NEARBY_SHELTERS_DATA[0].occupancy,
                })
              }
            >
              <HomeIcon size={14} color="#FFFFFF" />
            </Pressable>
          )}

          {/* Legend Overlay */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#22C55E" }]} />
              <Text style={styles.legendLabel}>Low</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#EAB308" }]} />
              <Text style={styles.legendLabel}>Moderate</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#F97316" }]} />
              <Text style={styles.legendLabel}>High</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.legendLabel}>Very High</Text>
            </View>
          </View>
        </View>

        {/* BOTTOM DETAIL CARD (WHEN MARKER IS TAPPED) */}
        {selectedItem && (
          <View style={styles.detailCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.detailType}>
                  {selectedItem.type === "shelter" ? "EMERGENCY SHELTER" : "MONITORED RIVER STATION"}
                </Text>
                <Text style={styles.detailTitle}>
                  {selectedItem.station || selectedItem.name}
                </Text>
              </View>

              {selectedItem.risk_level && (
                <View
                  style={[
                    styles.riskPill,
                    {
                      backgroundColor:
                        selectedItem.risk_level === "Very High"
                          ? "#FEE2E2"
                          : selectedItem.risk_level === "High"
                          ? "#FFEDD5"
                          : "#DCFCE7",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.riskPillText,
                      {
                        color:
                          selectedItem.risk_level === "Very High"
                            ? "#DC2626"
                            : selectedItem.risk_level === "High"
                            ? "#EA580C"
                            : "#166534",
                      },
                    ]}
                  >
                    {selectedItem.risk_level}
                  </Text>
                </View>
              )}
            </View>

            {selectedItem.current_water_level !== undefined ? (
              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.mLabel}>CURRENT LEVEL</Text>
                  <Text style={styles.mValue}>{selectedItem.current_water_level} m</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.mLabel}>PREDICTED LEVEL</Text>
                  <Text style={[styles.mValue, { color: "#2563EB" }]}>
                    {selectedItem.predicted_water_level} m
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.mLabel}>RAINFALL (12H)</Text>
                  <Text style={styles.mValue}>{selectedItem.rainfall_12hr} mm</Text>
                </View>
              </View>
            ) : (
              <View style={styles.shelterInfoBox}>
                <Text style={styles.shelterText}>
                  Capacity: {selectedItem.occupancy} / {selectedItem.capacity} occupants
                </Text>
              </View>
            )}

            <Pressable style={styles.closeCardBtn} onPress={() => setSelectedItem(null)}>
              <Text style={styles.closeText}>Dismiss Card</Text>
            </Pressable>
          </View>
        )}
      </View>
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
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  filterScroll: {
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  mapCanvasContainer: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
    borderWidth: 1,
    borderColor: "#94A3B8",
  },
  roadOne: {
    position: "absolute",
    width: "140%",
    height: 18,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "-30deg" }],
    top: "40%",
    left: "-20%",
  },
  roadTwo: {
    position: "absolute",
    width: 14,
    height: "140%",
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "15deg" }],
    left: "50%",
    top: "-20%",
  },
  userMarkerPosition: {
    position: "absolute",
    left: "48%",
    top: "48%",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    top: -12,
    left: -12,
  },
  userDotCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userLabelBadge: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  userLabelText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  stationPin: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    gap: 6,
    elevation: 3,
  },
  stationPinSelected: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  pinInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pinText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0F172A",
  },
  shelterPin: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  legendContainer: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
  },
  detailCard: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailType: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metricItem: {
    alignItems: "center",
  },
  mLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
  },
  mValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  shelterInfoBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
  },
  shelterText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  closeCardBtn: {
    marginTop: 12,
    alignItems: "center",
  },
  closeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
});
