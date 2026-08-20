import React from "react";
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
  Bell,
  MapPin,
  Navigation,
  TriangleAlert,
  Camera,
  ChevronRight,
  ShieldCheck,
  Siren,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>FloodSafe</Text>
            <Text style={styles.subtitle}>Community flood awareness</Text>
          </View>

          <Pressable style={styles.iconButton}>
            <Bell size={22} color="#172033" />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        {/* GREETING */}
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>Stay informed.</Text>
          <Text style={styles.greetingText}>
            See what's happening around you and report flooding when you spot
            it.
          </Text>
        </View>

        {/* MAP CARD */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.mapTitle}>Flood map</Text>
              <Text style={styles.mapSubtitle}>Around your location</Text>
            </View>

            <View style={styles.locationBadge}>
              <Navigation size={14} color="#2563EB" />
              <Text style={styles.locationText}>Live</Text>
            </View>
          </View>

          {/* MOCK MAP */}
          <View style={styles.map}>
            <View style={styles.mapRoadOne} />
            <View style={styles.mapRoadTwo} />
            <View style={styles.mapRoadThree} />

            {/* LOW RISK */}
            <View style={[styles.marker, styles.greenMarker, { left: "18%", top: "30%" }]}>
              <View style={styles.markerInner} />
            </View>

            {/* MODERATE */}
            <View style={[styles.marker, styles.orangeMarker, { left: "65%", top: "22%" }]}>
              <View style={styles.markerInner} />
            </View>

            {/* HIGH */}
            <View style={[styles.marker, styles.redMarker, { left: "72%", top: "62%" }]}>
              <View style={styles.markerInner} />
            </View>

            {/* USER */}
            <View style={styles.userLocation}>
              <View style={styles.userPulse} />
              <View style={styles.userDot}>
                <MapPin size={18} color="#FFFFFF" fill="#2563EB" />
              </View>
            </View>

            <View style={styles.mapLabel}>
              <MapPin size={14} color="#172033" />
              <Text style={styles.mapLabelText}>You</Text>
            </View>
          </View>

          <View style={styles.legend}>
            <LegendDot color="#22C55E" label="Low" />
            <LegendDot color="#F59E0B" label="Moderate" />
            <LegendDot color="#EF4444" label="High" />
          </View>
        </View>

        {/* ALERT CARD */}
        <View style={styles.alertCard}>
          <View style={styles.alertIcon}>
            <TriangleAlert size={22} color="#D97706" />
          </View>

          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>2 reports nearby</Text>
            <Text style={styles.alertText}>
              Flooding has been reported in your surrounding area.
            </Text>
          </View>

          <ChevronRight size={20} color="#9A6A16" />
        </View>

        {/* NEARBY RISK */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby risk</Text>
          <Text style={styles.viewMap}>View map</Text>
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskIcon}>
            <Siren size={21} color="#D97706" />
          </View>

          <View style={styles.riskInfo}>
            <View style={styles.riskTitleRow}>
              <Text style={styles.riskTitle}>Moderate flood risk</Text>

              <View style={styles.moderateBadge}>
                <Text style={styles.moderateText}>MODERATE</Text>
              </View>
            </View>

            <Text style={styles.riskDistance}>
              About 3.2 km from your location
            </Text>

            <Text style={styles.riskUpdated}>Updated recently</Text>
          </View>
        </View>

        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>What do you need?</Text>

        <View style={styles.actionRow}>
          <ActionButton
            icon={<Camera size={24} color="#FFFFFF" />}
            title="Report flood"
            subtitle="Send a report"
            primary
          />

          <ActionButton
            icon={<Bell size={24} color="#2563EB" />}
            title="Alerts"
            subtitle="See warnings"
          />
        </View>

        {/* SAFETY */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyIcon}>
            <ShieldCheck size={23} color="#15803D" />
          </View>

          <View style={styles.safetyTextContainer}>
            <Text style={styles.safetyTitle}>Stay safe</Text>
            <Text style={styles.safetyText}>
              Avoid flooded roads and follow official emergency instructions.
            </Text>
          </View>
        </View>

        {/* BOTTOM NAV */}
        <View style={styles.bottomNav}>
          <NavItem icon="🗺️" label="Map" active />
          <NavItem icon="🚨" label="Alerts" />
          <NavItem icon="📷" label="Report" />
          <NavItem icon="👤" label="Profile" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------------------------------------
   COMPONENTS
--------------------------------------------- */

function LegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  title,
  subtitle,
  primary = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionButton,
        primary ? styles.primaryAction : styles.secondaryAction,
      ]}
    >
      <View
        style={[
          styles.actionIcon,
          primary ? styles.primaryIcon : styles.secondaryIcon,
        ]}
      >
        {icon}
      </View>

      <Text
        style={[
          styles.actionTitle,
          primary && styles.primaryActionTitle,
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.actionSubtitle,
          primary && styles.primaryActionSubtitle,
        ]}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Pressable style={styles.navItem}>
      <Text style={[styles.navIcon, active && styles.activeNavIcon]}>
        {icon}
      </Text>

      <Text style={[styles.navLabel, active && styles.activeNavLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ---------------------------------------------
   STYLES
--------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styles: any = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 18,
  },

  brand: {
    fontSize: 25,
    fontWeight: "800",
    color: "#14213D",
    letterSpacing: -0.7,
  },

  subtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#718096",
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7ECF3",
  },

  notificationDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    top: 9,
    right: 10,
  },

  greeting: {
    marginTop: 27,
    marginBottom: 18,
  },

  greetingTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: "#14213D",
  },

  greetingText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#697586",
    maxWidth: 390,
  },

  mapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7ECF3",
  },

  mapHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingBottom: 12,
  },

  mapTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
  },

  mapSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#8792A2",
  },

  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },

  locationText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },

  map: {
    height: 245,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#E9F1E9",
    position: "relative",
  },

  mapRoadOne: {
    position: "absolute",
    width: "150%",
    height: 22,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "-25deg" }],
    top: "38%",
    left: "-20%",
  },

  mapRoadTwo: {
    position: "absolute",
    width: "150%",
    height: 17,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "30deg" }],
    top: "63%",
    left: "-20%",
  },

  mapRoadThree: {
    position: "absolute",
    width: 12,
    height: "140%",
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "12deg" }],
    left: "52%",
    top: "-20%",
  },

  marker: {
    position: "absolute",
    width: 25,
    height: 25,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  greenMarker: {
    backgroundColor: "#22C55E",
  },

  orangeMarker: {
    backgroundColor: "#F59E0B",
  },

  redMarker: {
    backgroundColor: "#EF4444",
  },

  markerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },

  userLocation: {
    position: "absolute",
    left: "43%",
    top: "47%",
    justifyContent: "center",
    alignItems: "center",
  },

  userPulse: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(37,99,235,0.15)",
  },

  userDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  mapLabel: {
    position: "absolute",
    left: "47%",
    top: "67%",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    elevation: 2,
  },

  mapLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#172033",
  },

  legend: {
    flexDirection: "row",
    gap: 18,
    paddingTop: 12,
    paddingHorizontal: 5,
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

  legendText: {
    fontSize: 11,
    color: "#707B8C",
  },

  alertCard: {
    marginTop: 15,
    backgroundColor: "#FFF8E7",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F6E6BA",
  },

  alertIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFEFBD",
    justifyContent: "center",
    alignItems: "center",
  },

  alertContent: {
    flex: 1,
    marginLeft: 11,
  },

  alertTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#704F00",
  },

  alertText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#8B6A22",
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#172033",
    marginTop: 20,
    marginBottom: 11,
  },

  viewMap: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  riskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E7ECF3",
  },

  riskIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#FFF4D6",
    justifyContent: "center",
    alignItems: "center",
  },

  riskInfo: {
    flex: 1,
    marginLeft: 11,
  },

  riskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  riskTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#172033",
  },

  moderateBadge: {
    backgroundColor: "#FFF3CD",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  moderateText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#A16207",
  },

  riskDistance: {
    marginTop: 5,
    fontSize: 11,
    color: "#667085",
  },

  riskUpdated: {
    marginTop: 3,
    fontSize: 10,
    color: "#9AA4B2",
  },

  actionRow: {
    flexDirection: "row",
    gap: 12,
  },

  actionButton: {
    flex: 1,
    borderRadius: 20,
    padding: 15,
    minHeight: 135,
  },

  primaryAction: {
    backgroundColor: "#2563EB",
  },

  secondaryAction: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E7F0",
  },

  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },

  primaryIcon: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  secondaryIcon: {
    backgroundColor: "#EFF6FF",
  },

  actionTitle: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "800",
    color: "#172033",
  },

  primaryActionTitle: {
    color: "#FFFFFF",
  },

  actionSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#7B8798",
  },

  primaryActionSubtitle: {
    color: "#DCE8FF",
  },

  safetyCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F0FDF4",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#D5F5DE",
  },

  safetyIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },

  safetyTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  safetyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },

  safetyText: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: "#4D7C5A",
  },

  bottomNav: {
    marginTop: 25,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#E7ECF3",
  },

  navItem: {
    alignItems: "center",
    minWidth: 65,
  },

  navIcon: {
    fontSize: 19,
    opacity: 0.55,
  },

  activeNavIcon: {
    opacity: 1,
  },

  navLabel: {
    marginTop: 4,
    fontSize: 9,
    color: "#8993A3",
    fontWeight: "600",
  },

  activeNavLabel: {
    color: "#2563EB",
  },
});