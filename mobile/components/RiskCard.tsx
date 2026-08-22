import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../constants/theme';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react-native';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

interface RiskCardProps {
  level: RiskLevel;
  message: string;
  updatedTime: string;
}

export const RiskCard: React.FC<RiskCardProps> = ({ level, message, updatedTime }) => {
  const getRiskConfig = () => {
    switch (level) {
      case 'VERY_HIGH':
      case 'HIGH':
        return {
          bgColor: Colors.emergencyBg,
          borderColor: Colors.emergency,
          iconColor: Colors.emergency,
          title: 'HIGH RISK',
          titleColor: Colors.emergency,
          Icon: AlertTriangle,
        };
      case 'MODERATE':
        return {
          bgColor: Colors.warningBg,
          borderColor: Colors.warning,
          iconColor: Colors.warning,
          title: 'MODERATE RISK',
          titleColor: Colors.warning,
          Icon: Info,
        };
      case 'LOW':
      default:
        return {
          bgColor: Colors.safeBg,
          borderColor: Colors.safe,
          iconColor: Colors.safe,
          title: 'LOW RISK',
          titleColor: Colors.safe,
          Icon: CheckCircle2,
        };
    }
  };

  const config = getRiskConfig();
  const { Icon } = config;

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon size={20} color={config.iconColor} />
          <Text style={[styles.title, { color: config.titleColor }]}>{config.title}</Text>
        </View>
        <Text style={styles.timeText}>Updated {updatedTime}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.navy,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 26,
  },
});
