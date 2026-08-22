import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { MapPin, Users, ChevronRight } from 'lucide-react-native';

interface ShelterCardProps {
  name: string;
  distance: string;
  availability: 'HIGH' | 'MEDIUM' | 'LOW' | 'FULL';
  onPress: () => void;
}

export const ShelterCard: React.FC<ShelterCardProps> = ({ 
  name, 
  distance, 
  availability,
  onPress 
}) => {
  const getAvailabilityConfig = () => {
    switch (availability) {
      case 'HIGH':
        return { color: Colors.safe, text: 'Space Available' };
      case 'MEDIUM':
        return { color: Colors.warning, text: 'Filling Up' };
      case 'LOW':
        return { color: Colors.emergency, text: 'Almost Full' };
      case 'FULL':
        return { color: Colors.textSecondary, text: 'Full' };
      default:
        return { color: Colors.safe, text: 'Space Available' };
    }
  };

  const config = getAvailabilityConfig();

  return (
    <TouchableOpacity 
      style={styles.container} 
      activeOpacity={0.7} 
      onPress={onPress}
    >
      <View style={styles.iconContainer}>
        <MapPin size={24} color={Colors.primary} />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.detailsRow}>
          <Text style={styles.distance}>{distance} away</Text>
          <View style={styles.dot} />
          <View style={styles.availabilityContainer}>
            <Users size={12} color={config.color} />
            <Text style={[styles.availability, { color: config.color }]}>
              {config.text}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <ChevronRight size={20} color={Colors.border} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distance: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availability: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionContainer: {
    marginLeft: 8,
  },
});
