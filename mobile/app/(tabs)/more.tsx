import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  User,
  MapPin,
  Bell,
  Globe,
  PhoneCall,
  HelpCircle,
  Shield,
  FileText,
  ChevronRight,
  Info,
} from "lucide-react-native";
import { EMERGENCY_CONTACTS } from "@/constants/data";

export default function MoreScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedLang, setSelectedLang] = useState<"EN" | "SI" | "TA">("EN");

  const handleChangeLanguage = (lang: "EN" | "SI" | "TA") => {
    setSelectedLang(lang);
    Alert.alert("Language Updated", `Display language set to ${lang === "EN" ? "English" : lang === "SI" ? "Sinhala (සිංහල)" : "Tamil (தமிழ்)"}`);
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
          <Text style={styles.title}>More Settings</Text>
          <Text style={styles.subtitle}>Preferences & Emergency Information</Text>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <User size={24} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Nuwan Perera</Text>
            <Text style={styles.profileRole}>Registered Citizen • Western Province</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* SAVED LOCATIONS */}
        <Text style={styles.sectionHeading}>Saved Locations</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <MapPin size={18} color="#2563EB" />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Primary Residence</Text>
              <Text style={styles.menuSub}>Hanwella, Kaduwela Division</Text>
            </View>
            <Text style={styles.tagText}>Active Risk</Text>
          </View>

          <View style={styles.menuItemBordered}>
            <MapPin size={18} color="#64748B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Workplace</Text>
              <Text style={styles.menuSub}>Colombo 03, Kollupitiya</Text>
            </View>
            <Text style={styles.tagTextLow}>Low Risk</Text>
          </View>
        </View>

        {/* LANGUAGE SELECTION */}
        <Text style={styles.sectionHeading}>Language (භාෂාව / மொழி)</Text>
        <View style={styles.langRow}>
          <Pressable
            style={[styles.langBtn, selectedLang === "EN" && styles.langBtnActive]}
            onPress={() => handleChangeLanguage("EN")}
          >
            <Text style={[styles.langText, selectedLang === "EN" && styles.langTextActive]}>English</Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, selectedLang === "SI" && styles.langBtnActive]}
            onPress={() => handleChangeLanguage("SI")}
          >
            <Text style={[styles.langText, selectedLang === "SI" && styles.langTextActive]}>සිංහල</Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, selectedLang === "TA" && styles.langBtnActive]}
            onPress={() => handleChangeLanguage("TA")}
          >
            <Text style={[styles.langText, selectedLang === "TA" && styles.langTextActive]}>தமிழ்</Text>
          </Pressable>
        </View>

        {/* PREFERENCES */}
        <Text style={styles.sectionHeading}>Preferences</Text>
        <View style={styles.menuGroup}>
          <View style={styles.menuItem}>
            <Bell size={18} color="#2563EB" />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Emergency Warnings</Text>
              <Text style={styles.menuSub}>Receive instant push alerts when risk increases</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
              thumbColor={notificationsEnabled ? "#2563EB" : "#F1F5F9"}
            />
          </View>
        </View>

        {/* HELP & SYSTEM INFORMATION */}
        <Text style={styles.sectionHeading}>System Information</Text>
        <View style={styles.menuGroup}>
          <Pressable
            style={styles.menuItem}
            onPress={() => router.push("/sos")}
          >
            <PhoneCall size={18} color="#DC2626" />
            <Text style={[styles.menuTitle, { flex: 1, color: "#DC2626" }]}>Emergency Direct SOS</Text>
            <ChevronRight size={18} color="#DC2626" />
          </Pressable>

          <View style={styles.menuItemBordered}>
            <Info size={18} color="#64748B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.menuTitle}>Flood-Risk-Emergency-Response-System</Text>
              <Text style={styles.menuSub}>Version 1.0.0 • Disaster Management Center</Text>
            </View>
          </View>

          <View style={styles.menuItemBordered}>
            <Shield size={18} color="#64748B" />
            <Text style={[styles.menuTitle, { flex: 1 }]}>Terms of Service & Privacy Policy</Text>
            <ChevronRight size={18} color="#94A3B8" />
          </View>
        </View>

        <Text style={styles.copyText}>© 2026 Disaster Management Center — Sri Lanka</Text>
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
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  profileRole: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#94A3B8",
    marginTop: 16,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  menuGroup: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  menuItemBordered: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  menuSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#EA580C",
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagTextLow: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  langRow: {
    flexDirection: "row",
    gap: 8,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  langBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  langText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  langTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  copyText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 30,
    fontWeight: "600",
  },
});
