import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '@/constants/theme';
import { MapBottomSheet } from '@/components/MapBottomSheet';
import { Layers, Crosshair } from 'lucide-react-native';
import { STATION_DATA, StationItem } from '@/constants/data';

const { width, height } = Dimensions.get('window');

// ─── Web Fallback ─────────────────────────────────────────────────────────────
function WebFallback() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webContent}>
        <Text style={styles.webIcon}>🗺️</Text>
        <Text style={styles.webTitle}>Map View</Text>
        <Text style={styles.webSubtitle}>
          The interactive map is available on the{'\n'}iOS and Android apps.
        </Text>
        <View style={styles.webBadge}>
          <Text style={styles.webBadgeText}>📱 Mobile Only Feature</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MapScreen() {
  const [selectedStation, setSelectedStation] = useState<StationItem | null>(null);
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);

  const initialRegion = {
    latitude: 6.904,
    longitude: 80.082,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  const mapRef = React.useRef<MapView>(null);

  // On web, react-native-maps is stubbed to a no-op via metro.config.js resolver.
  // Render the fallback UI instead of the (empty stub) map.
  if (Platform.OS === 'web') {
    return <WebFallback />;
  }

  const handleMarkerPress = (station: StationItem) => {
    setSelectedStation(station);
    setBottomSheetVisible(true);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: station.latitude - 0.02,
          longitude: station.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        500
      );
    }
  };

  const recenterMap = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion(initialRegion, 500);
    }
  };

  const getMarkerColor = (risk: string) => {
    if (risk.includes('High')) return Colors.emergency;
    if (risk.includes('Moderate')) return Colors.warning;
    return Colors.safe;
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {STATION_DATA.map((station: StationItem) => (
          <Marker
            key={station.id}
            coordinate={{
              latitude: station.latitude,
              longitude: station.longitude,
            }}
            onPress={() => handleMarkerPress(station)}
          >
            <View
              style={[
                styles.markerContainer,
                { backgroundColor: getMarkerColor(station.risk_level) },
              ]}
            >
              <View style={styles.markerInner} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton}>
          <Layers size={24} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={recenterMap}>
          <Crosshair size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {selectedStation && (
        <MapBottomSheet
          visible={isBottomSheetVisible}
          onClose={() => setBottomSheetVisible(false)}
          stationName={selectedStation.station}
          riverName="Kelani Ganga"
          riskLevel={selectedStation.risk_level.toUpperCase().replace(' ', '_') as 'HIGH' | 'MODERATE' | 'LOW'}
          currentLevel={`${selectedStation.current_water_level} m`}
          trend="RISING"
          predictedLevel={`${selectedStation.predicted_water_level} m`}
          updatedTime="Just now"
          onViewDetails={() => setBottomSheetVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  map: {
    width: width,
    height: height,
  },
  markerContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface,
  },
  controlsContainer: {
    position: 'absolute',
    right: 16,
    top: 60,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  webContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  webIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  webTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  webSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary ?? '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  webBadge: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border ?? '#374151',
  },
  webBadgeText: {
    fontSize: 14,
    color: Colors.textSecondary ?? '#9CA3AF',
    fontWeight: '600',
  },
});
