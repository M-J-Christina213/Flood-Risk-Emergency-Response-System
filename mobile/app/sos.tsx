import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { EmergencyButton } from '@/components/EmergencyButton';
import { X, MapPin, Phone, ShieldCheck } from 'lucide-react-native';
import * as Location from 'expo-location';

export default function SosScreen() {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSosPress = () => {
    Alert.alert(
      'SEND SOS ALER',
      'This will immediately dispatch your location to emergency responders. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'SEND SOS', 
          style: 'destructive',
          onPress: () => {
            setIsSending(true);
            // Simulate network request
            setTimeout(() => {
              setIsSending(false);
              setIsSent(true);
            }, 1500);
          }
        },
      ]
    );
  };

  if (isSent) {
    return (
      <SafeAreaView style={[styles.container, styles.sentContainer]}>
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={Colors.surface} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.successIcon}>
            <ShieldCheck size={64} color={Colors.safe} />
          </View>
          <Text style={styles.title}>SOS REQUEST SENT</Text>
          <Text style={styles.subtitle}>
            Emergency responders have been notified of your location. Stay calm and stay in a safe place.
          </Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MapPin size={20} color={Colors.surface} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Your Location</Text>
                <Text style={styles.infoValue}>Hanwella, Western Province</Text>
                <Text style={styles.infoSubtext}>GPS Accuracy: 4m</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Phone size={20} color={Colors.surface} />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>DMC Hotline</Text>
                <Text style={styles.infoValue}>117</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <EmergencyButton onPress={handleSosPress} />
        
        <Text style={styles.disclaimerText}>
          Your location will be shared with emergency responders immediately.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Pitch black for emergency environment
  },
  sentContainer: {
    backgroundColor: Colors.navy,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  disclaimerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 48,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.surface,
    letterSpacing: 1,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
  infoSubtext: {
    fontSize: 12,
    color: Colors.safe,
    marginTop: 4,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
});
