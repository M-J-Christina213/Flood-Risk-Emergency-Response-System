import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';
import { Siren } from 'lucide-react-native';

interface EmergencyButtonProps {
  onPress: () => void;
  title?: string;
  subtitle?: string;
}

export const EmergencyButton: React.FC<EmergencyButtonProps> = ({ 
  onPress,
  title = 'SOS',
  subtitle = 'TAP TO REQUEST HELP'
}) => {
  return (
    <TouchableOpacity 
      style={styles.button} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.outerRing}>
        <View style={styles.innerRing}>
          <View style={styles.core}>
            <Siren size={48} color={Colors.surface} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.emergency,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
  title: {
    color: Colors.surface,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
});
