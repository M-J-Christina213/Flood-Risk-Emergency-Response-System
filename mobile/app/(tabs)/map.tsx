import React, { useState, useEffect } from 'react';
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
import { Layers, Crosshair, MapPin } from 'lucide-react-native';
import { STATION_DATA, StationItem, NEARBY_SHELTERS_DATA, ShelterItem } from '@/constants/data';

const { width, height } = Dimensions.get('window');

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MapScreen() {
  const [selectedStation, setSelectedStation] = useState<StationItem | null>(null);
  const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const initialRegion = {
    latitude: 6.904,
    longitude: 80.082,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  };

  const mapRef = React.useRef<MapView>(null);

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

  // On web, use the react-leaflet WebMap component
  if (Platform.OS === 'web') {
    if (!isClient) {
      return <SafeAreaView style={styles.container} />;
    }
    const WebMap = require('@/components/WebMap').default;
    return (
      <SafeAreaView style={styles.container}>
        <WebMap onMarkerPress={handleMarkerPress} />
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
        {/* Render River Stations */}
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

        {/* Render Safe Shelters */}
        {NEARBY_SHELTERS_DATA.map((shelter: ShelterItem) => (
          <Marker
            key={shelter.id}
            coordinate={{
              latitude: shelter.lat,
              longitude: shelter.lon,
            }}
            title={shelter.name}
            description={`Capacity: ${shelter.capacity - shelter.occupancy} available`}
          >
            <View style={styles.shelterMarker}>
              <MapPin size={16} color="#fff" />
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
  shelterMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
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
  }
});
