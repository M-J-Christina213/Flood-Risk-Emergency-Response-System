import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { AlertTriangle, Info, BellRing } from 'lucide-react-native';

export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

interface AlertCardProps {
  title: string;
  location: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  title,
  location,
  message,
  severity,
  timestamp,
}) => {
  const getSeverityConfig = () => {
    switch (severity) {
      case 'HIGH':
        return {
          color: Colors.emergency,
          bgColor: Colors.emergencyBg,
          Icon: AlertTriangle,
          label: 'CRITICAL',
        };
      case 'MEDIUM':
        return {
          color: Colors.warning,
          bgColor: Colors.warningBg,
          Icon: BellRing,
          label: 'WARNING',
        };
      case 'LOW':
      case 'INFO':
      default:
        return {
          color: Colors.primary,
          bgColor: Colors.primaryLight,
          Icon: Info,
          label: 'INFO',
        };
    }
  };

  const config = getSeverityConfig();
  const { Icon } = config;

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: config.color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
            <Icon size={12} color={config.color} />
            <Text style={[styles.badgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
          <Text style={styles.time}>{timestamp}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.location}>{location}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  indicator: {
    width: 6,
    height: '100%',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
