import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { WifiOff } from 'lucide-react-native';

export const OfflineBanner: React.FC = () => {
  return (
    <View style={styles.container}>
      <WifiOff size={20} color={Colors.surface} />
      <View style={styles.content}>
        <Text style={styles.title}>You&apos;re offline</Text>
        <Text style={styles.message}>
          Your report has been saved on this device and will be sent automatically when you&apos;re back online.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  content: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
});
