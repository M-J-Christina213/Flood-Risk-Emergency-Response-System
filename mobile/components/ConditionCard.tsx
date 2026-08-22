import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { LucideIcon } from 'lucide-react-native';

interface ConditionCardProps {
  title: string;
  value: string;
  subtitle?: string;
  subtitleColor?: string;
  Icon: LucideIcon;
}

export const ConditionCard: React.FC<ConditionCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  subtitleColor = Colors.textSecondary,
  Icon 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon size={16} color={Colors.primary} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: subtitleColor }]}>{subtitle}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
});
