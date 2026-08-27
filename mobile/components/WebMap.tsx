import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { STATION_DATA, StationItem, NEARBY_SHELTERS_DATA, ShelterItem } from '@/constants/data';
import { Colors } from '@/constants/theme';

// Fix for default Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const createCustomIcon = (risk: string) => {
  let color = Colors.safe;
  if (risk.includes('High')) color = Colors.emergency;
  else if (risk.includes('Moderate')) color = Colors.warning;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0px 2px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createShelterIcon = () => {
  return L.divIcon({
    className: 'custom-leaflet-shelter',
    html: `<div style="
      background-color: #10b981;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0px 2px 4px rgba(0,0,0,0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
    ">H</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface WebMapProps {
  onMarkerPress: (station: StationItem) => void;
}

export default function WebMap({ onMarkerPress }: WebMapProps) {
  const initialCenter: [number, number] = [6.904, 80.082];
  const initialZoom = 11;

  return (
    <View style={styles.container}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {STATION_DATA.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={createCustomIcon(station.risk_level)}
            eventHandlers={{
              click: () => onMarkerPress(station),
            }}
          >
            <Popup>
              <strong>{station.station}</strong><br />
              Risk: {station.risk_level}
            </Popup>
          </Marker>
        ))}
        {NEARBY_SHELTERS_DATA.map((shelter) => (
          <Marker
            key={shelter.id}
            position={[shelter.lat, shelter.lon]}
            icon={createShelterIcon()}
          >
            <Popup>
              <strong>{shelter.name}</strong><br />
              Capacity: {shelter.capacity - shelter.occupancy} available
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
