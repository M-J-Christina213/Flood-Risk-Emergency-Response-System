import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Siren,
  PhoneCall,
  MapPin,
  X,
  ShieldAlert,
  Home as HomeIcon,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react-native";
import { EMERGENCY_CONTACTS, NEARBY_SHELTERS_DATA } from "@/constants/data";

export default function SOSScreen() {
  const router = useRouter();
  const [sosActive, setSosActive] = useState(false);
  const [sending, setSending] = useState(false);

  const handleTriggerSOS = () => {
    Alert.alert(
      "Confirm Emergency SOS",
      "Are you sure you want to broadcast your GPS location to Disaster Management Center (DMC) emergency teams?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "BROADCAST SOS",
          style: "destructive",
          onPress: () => {
            setSending(true);
            setTimeout(() => {
              setSending(false);
              setSosActive(true);
            }, 800);
          },
        },
      ]
    );
  };

  const handleCancelSOS = () => {
    setSosActive(false);
    Alert.alert("SOS Rescinded", "Your emergency status has been marked resolved.");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>EMERGENCY ASSISTANCE</Text>
        <Pressable style={styles.closeBtn} onPress={() => router.back()}>
          <X size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* ACTIVE SOS BANNER */}
        {sosActive ? (
          <View style={styles.activeBanner}>
            <View style={styles.activePulseCircle}>
              <CheckCircle2 size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.activeTitle}>EMERGENCY BROADCAST ACTIVE</Text>
            <Text style={styles.activeSub}>
              Your GPS coordinates (6.9069° N, 80.1347° E) have been transmitted to DMC Emergency Response Unit.
            </Text>
            <Pressable style={styles.cancelSosBtn} onPress={handleCancelSOS}>
              <Text style={styles.cancelSosText}>Cancel SOS Request</Text>
            </Pressable>
          </View>
        ) : (
          /* SOS TRIGGER BUTTON */
          <View style={styles.triggerCard}>
            <Text style={styles.triggerHeading}>In immediate danger?</Text>
            <Text style={styles.triggerSub}>
              Tap the button below to send your exact GPS location to emergency responders.
            </Text>

            <Pressable
              style={[styles.bigSosButton, sending && { opacity: 0.6 }]}
              onPress={handleTriggerSOS}
              disabled={sending}
            >
              <Siren size={52} color="#FFFFFF" />
              <Text style={styles.bigSosText}>
                {sending ? "SENDING..." : "PUSH FOR SOS"}
              </Text>
            </Pressable>

            <Text style={styles.gpsNotice}>
              GPS Location: Hanwella, Western Province (Auto Captured)
            </Text>
          </View>
        )}

        {/* EMERGENCY HOTLINES SECTION */}
        <Text style={styles.sectionHeading}>Emergency Direct Lines</Text>
        <View style={styles.contactsList}>
          {EMERGENCY_CONTACTS.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactIconBox}>
                <PhoneCall size={18} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactCat}>{contact.category} Hotline</Text>
              </View>
              <View style={styles.numberBadge}>
                <Text style={styles.numberText}>{contact.number}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* NEAREST SHELTER & HOSPITAL */}
        <Text style={styles.sectionHeading}>Nearest Refuge Facilities</Text>

        <View style={styles.facilityCard}>
          <HomeIcon size={20} color="#2563EB" />
          <View style={{ flex: 1 }}>
            <Text style={styles.facilityTitle}>{NEARBY_SHELTERS_DATA[0].name}</Text>
            <Text style={styles.facilitySub}>
              {NEARBY_SHELTERS_DATA[0].distanceKm} km away • {NEARBY_SHELTERS_DATA[0].phone}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },
  triggerCard: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  triggerHeading: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  triggerSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  bigSosButton: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 24,
    borderWidth: 6,
    borderColor: "#F87171",
    elevation: 8,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  bigSosText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 10,
    letterSpacing: 0.5,
  },
  gpsNotice: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  activeBanner: {
    backgroundColor: "#15803D",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  activePulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  activeSub: {
    fontSize: 12,
    color: "#DCFCE7",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  cancelSosBtn: {
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cancelSosText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#94A3B8",
    marginTop: 26,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  contactsList: {
    gap: 10,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  contactIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  contactName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  contactCat: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  numberBadge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  numberText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  facilityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 12,
  },
  facilityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  facilitySub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
});
