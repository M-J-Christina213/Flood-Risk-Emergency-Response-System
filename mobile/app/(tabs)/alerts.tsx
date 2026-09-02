import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';
import { AlertCard, AlertSeverity } from '@/components/AlertCard';
import { Bell, RefreshCw } from 'lucide-react-native';
import { fetchAlerts } from '@/services/api';

const ALERTS_DATA = [
  {
    id: '1',
    title: 'Flood Warning',
    location: 'Kelani Ganga — Hanwella',
    message: 'Water levels are expected to rise above minor flood level in the next 24 hours. Evacuate low-lying areas.',
    severity: 'HIGH' as AlertSeverity,
    timestamp: '10m ago',
    type: 'WARNING',
  },
  {
    id: '2',
    title: 'Heavy Rainfall Warning',
    location: 'Western Province',
    message: 'Heavy rainfall expected exceeding 100mm. Possibility of localized urban flooding.',
    severity: 'MEDIUM' as AlertSeverity,
    timestamp: '2h ago',
    type: 'WARNING',
  },
  {
    id: '3',
    title: 'River Level Alert',
    location: 'Kalu Ganga — Ratnapura',
    message: 'Water level is rising rapidly. Please stay alert.',
    severity: 'MEDIUM' as AlertSeverity,
    timestamp: '4h ago',
    type: 'WARNING',
  },
  {
    id: '4',
    title: 'Shelter Opened',
    location: 'Colombo District',
    message: 'Three new emergency shelters have been opened for displaced residents.',
    severity: 'INFO' as AlertSeverity,
    timestamp: '1d ago',
    type: 'INFORMATION',
  },
];

export default function AlertsScreen() {
  const [filter, setFilter] = useState<'ALL' | 'WARNINGS' | 'INFORMATION'>('ALL');

  const [alertsData, setAlertsData] = useState<any[]>(ALERTS_DATA);
  const [loading, setLoading] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    const data = await fetchAlerts();
    if (data && data.length > 0) {
      setAlertsData(data.map((alert: any) => ({
        id: alert.id,
        title: alert.title,
        location: alert.location || alert.station || '',
        message: alert.message,
        severity: alert.severity.toUpperCase() as AlertSeverity,
        timestamp: new Date(alert.time).toLocaleTimeString(),
        type: 'WARNING'
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filteredAlerts = alertsData.filter(alert => {
    if (filter === 'ALL') return true;
    if (filter === 'WARNINGS') return alert.type === 'WARNING';
    if (filter === 'INFORMATION') return alert.type === 'INFORMATION';
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={24} color={Colors.text} />
          <Text style={styles.headerTitle}>Alerts & Warnings</Text>
        </View>
        <TouchableOpacity onPress={loadAlerts}>
          <RefreshCw size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {['ALL', 'WARNINGS', 'INFORMATION'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              filter === f && styles.filterButtonActive
            ]}
            onPress={() => setFilter(f as any)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive
              ]}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map(alert => (
            <AlertCard
              key={alert.id}
              title={alert.title}
              location={alert.location}
              message={alert.message}
              severity={alert.severity}
              timestamp={alert.timestamp}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No alerts found for this category.</Text>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.surface,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
