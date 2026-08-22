import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Colors } from '../constants/theme';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

const { height } = Dimensions.get('window');

interface MapBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  stationName: string;
  riverName: string;
  riskLevel: 'HIGH' | 'MODERATE' | 'LOW';
  currentLevel: string;
  trend: 'RISING' | 'FALLING' | 'STABLE';
  predictedLevel: string;
  updatedTime: string;
  onViewDetails: () => void;
}

export const MapBottomSheet: React.FC<MapBottomSheetProps> = ({
  visible,
  onClose,
  stationName,
  riverName,
  riskLevel,
  currentLevel,
  trend,
  predictedLevel,
  updatedTime,
  onViewDetails
}) => {
  const translateY = React.useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'HIGH': return Colors.emergency;
      case 'MODERATE': return Colors.warning;
      case 'LOW': return Colors.safe;
      default: return Colors.primary;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'RISING': return <TrendingUp size={16} color={Colors.emergency} />;
      case 'FALLING': return <TrendingDown size={16} color={Colors.safe} />;
      case 'STABLE': return <Minus size={16} color={Colors.textSecondary} />;
    }
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.riverName}>{riverName}</Text>
            <Text style={styles.stationName}>{stationName} Station</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.riskBadge, { backgroundColor: getRiskColor() + '20' }]}>
          <Text style={[styles.riskText, { color: getRiskColor() }]}>
            {riskLevel} RISK
          </Text>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current level:</Text>
            <Text style={styles.detailValue}>{currentLevel}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trend:</Text>
            <View style={styles.trendContainer}>
              {getTrendIcon()}
              <Text style={[styles.detailValue, { marginLeft: 4 }]}>{trend}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Predicted level:</Text>
            <Text style={styles.detailValue}>{predictedLevel}</Text>
          </View>
        </View>

        <Text style={styles.timeText}>Updated {updatedTime}</Text>

        <TouchableOpacity style={styles.actionButton} onPress={onViewDetails}>
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  riverName: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stationName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
    backgroundColor: Colors.background,
    borderRadius: 16,
  },
  riskBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  riskText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailsContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
