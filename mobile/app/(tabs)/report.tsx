import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Text, TouchableOpacity, ScrollView, TextInput, Alert, Dimensions } from 'react-native';
import { Colors } from '@/constants/theme';
import { ReportOptionCard } from '@/components/ReportOptionCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Waves, Car, Users, House, AlertTriangle, MapPin, CheckCircle2, ChevronRight, ChevronLeft, Camera } from 'lucide-react-native';
import * as Location from 'expo-location';
import { submitReportToBackend } from '@/services/api';

const { width } = Dimensions.get('window');

const REPORT_OPTIONS = [
  { id: 'water_road', title: 'Water on road', icon: Waves },
  { id: 'road_flooded', title: 'Road flooded', icon: Waves },
  { id: 'water_building', title: 'Water entering building', icon: House },
  { id: 'vehicle_stranded', title: 'Vehicle stranded', icon: Car },
  { id: 'people_assistance', title: 'People need assistance', icon: Users },
  { id: 'bridge_damaged', title: 'Bridge/road damaged', icon: AlertTriangle },
  { id: 'other', title: 'Other', icon: AlertTriangle },
];

const SEVERITY_OPTIONS = [
  { id: 'LOW', label: 'Low' },
  { id: 'MODERATE', label: 'Moderate' },
  { id: 'SEVERE', label: 'Severe' },
  { id: 'CRITICAL', label: 'Critical' },
];

export default function ReportScreen() {
  const [step, setStep] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState('Fetching address...');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false); // In a real app, use NetInfo
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportId, setReportId] = useState<string>('PENDING');

  useEffect(() => {
    if (step === 2 && !location) {
      getLocation();
    }
  }, [step]);

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      
      // Simulate reverse geocoding
      setTimeout(() => setAddress('Hanwella, Western Province (Estimated)'), 1000);
    } catch (e) {
      setAddress('Could not fetch location automatically');
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedIncident) {
      Alert.alert('Selection Required', 'Please select what is happening.');
      return;
    }
    if (step === 3 && !severity) {
      Alert.alert('Severity Required', 'Please select the severity level.');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Fallback if Location is not available
    const lat = location?.coords?.latitude || 6.9271;
    const lon = location?.coords?.longitude || 79.8612;

    const payload = {
      report_type: selectedIncident || 'other',
      severity: (severity || 'moderate').toLowerCase() as any,
      description: description,
      latitude: lat,
      longitude: lon,
    };

    const res = await submitReportToBackend(payload);
    
    setIsSubmitting(false);

    if (res && res.success) {
      setReportId(res.report.id);
      setIsSubmitted(true);
    } else {
      Alert.alert('Submission Failed', 'Could not submit the report to the server. Please try again.');
    }
  };

  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicatorContainer}>
        {[1, 2, 3, 4].map((s, index) => (
          <React.Fragment key={s}>
            <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
              <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
            </View>
            {index < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
          </React.Fragment>
        ))}
      </View>
    );
  };

  if (isSubmitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <CheckCircle2 size={64} color={Colors.safe} />
          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successText}>
            Thank you. Your report has been submitted to emergency responders.
          </Text>
          <View style={styles.reportIdBox}>
            <Text style={styles.reportIdLabel}>REPORT ID</Text>
            <Text style={styles.reportIdValue}>#{reportId.slice(-6).toUpperCase()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.doneButton}
            onPress={() => {
              setStep(1);
              setSelectedIncident(null);
              setSeverity(null);
              setDescription('');
              setReportId('PENDING');
              setIsSubmitted(false);
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.headerTitle}>Report Incident</Text>
        <View style={{ width: 40 }} />
      </View>

      {renderStepIndicator()}
      {isOffline && <View style={{ paddingHorizontal: 20 }}><OfflineBanner /></View>}

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What is happening?</Text>
            <Text style={styles.stepSubtitle}>Select the option that best describes the situation.</Text>
            
            {REPORT_OPTIONS.map((opt) => (
              <ReportOptionCard
                key={opt.id}
                title={opt.title}
                Icon={opt.icon}
                selected={selectedIncident === opt.id}
                onPress={() => setSelectedIncident(opt.id)}
              />
            ))}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Where?</Text>
            <Text style={styles.stepSubtitle}>Confirm your current location for the report.</Text>

            <View style={styles.mapPreview}>
              <View style={styles.mapPlaceholder}>
                <MapPin size={32} color={Colors.primary} />
                <Text style={styles.mapPlaceholderText}>Map Preview</Text>
              </View>
            </View>

            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>DETECTED ADDRESS</Text>
              <Text style={styles.locationValue}>{address}</Text>
              {location && (
                <Text style={styles.accuracyText}>
                  GPS Accuracy: {Math.round(location.coords.accuracy || 0)}m
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.outlineButton}>
              <Text style={styles.outlineButtonText}>Adjust Location Manually</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Details</Text>
            <Text style={styles.stepSubtitle}>Provide additional information (optional).</Text>

            <TouchableOpacity style={styles.photoUpload}>
              <Camera size={32} color={Colors.primary} />
              <Text style={styles.photoUploadText}>Add Photo</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={4}
              placeholder="Any additional details..."
              placeholderTextColor={Colors.textSecondary}
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.inputLabel}>SEVERITY LEVEL *</Text>
            <View style={styles.severityGrid}>
              {SEVERITY_OPTIONS.map((sev) => (
                <TouchableOpacity
                  key={sev.id}
                  style={[
                    styles.severityBtn,
                    severity === sev.id && styles.severityBtnActive
                  ]}
                  onPress={() => setSeverity(sev.id)}
                >
                  <Text style={[
                    styles.severityText,
                    severity === sev.id && styles.severityTextActive
                  ]}>
                    {sev.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Report</Text>
            <Text style={styles.stepSubtitle}>Please verify the information before submitting.</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>INCIDENT</Text>
                <Text style={styles.summaryValue}>
                  {REPORT_OPTIONS.find(o => o.id === selectedIncident)?.title}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>LOCATION</Text>
                <Text style={styles.summaryValue}>{address}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>SEVERITY</Text>
                <Text style={styles.summaryValue}>{severity}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, isSubmitting && { opacity: 0.7 }]} 
          onPress={step === 4 ? handleSubmit : handleNext}
          disabled={isSubmitting}
        >
          <Text style={styles.nextButtonText}>
            {step === 4 ? (isSubmitting ? 'Submitting...' : 'Submit Report') : 'Next Step'}
          </Text>
          {step < 4 && <ChevronRight size={20} color={Colors.surface} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 40,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  stepNumberActive: {
    color: Colors.surface,
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  nextButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  nextButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  mapPreview: {
    height: 200,
    backgroundColor: Colors.border,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  mapPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  locationDetails: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  accuracyText: {
    fontSize: 12,
    color: Colors.safe,
    fontWeight: '500',
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  photoUpload: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  photoUploadText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  severityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  severityBtn: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  severityBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  severityText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  severityTextActive: {
    color: Colors.surface,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 16,
  },
  summaryRow: {
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  reportIdBox: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    marginBottom: 40,
  },
  reportIdLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  reportIdValue: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: 2,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
