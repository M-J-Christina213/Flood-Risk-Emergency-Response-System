export interface StationItem {
  id: string;
  station: string;
  latitude: number;
  longitude: number;
  risk_level: 'High Risk' | 'Moderate Risk' | 'Low Risk';
  current_water_level: number;
  predicted_water_level: number;
}

export const STATION_DATA: StationItem[] = [
  { id: "ST-1", station: "Hanwella", latitude: 6.9085, longitude: 80.0834, risk_level: "High Risk", current_water_level: 8.42, predicted_water_level: 9.10 },
  { id: "ST-2", station: "Glencourse", latitude: 6.9780, longitude: 80.1856, risk_level: "Moderate Risk", current_water_level: 5.87, predicted_water_level: 6.30 },
  { id: "ST-3", station: "Dunamale", latitude: 7.0025, longitude: 80.3511, risk_level: "Low Risk", current_water_level: 2.15, predicted_water_level: 2.40 },
  { id: "ST-4", station: "Norwood", latitude: 6.8342, longitude: 80.6154, risk_level: "Low Risk", current_water_level: 1.60, predicted_water_level: 1.75 },
];

export interface ShelterItem {
  id: string;
  name: string;
  distanceKm: number;
  capacity: number;
  occupancy: number;
  locationName: string;
  phone: string;
  lat: number;
  lon: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  number: string;
  category: "Hotline" | "Rescue" | "Medical" | "Police";
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id: "1", name: "Disaster Management Center (DMC)", number: "117", category: "Hotline" },
  { id: "2", name: "Sri Lanka Navy Flood Rescue", number: "011-2445368", category: "Rescue" },
  { id: "3", name: "National Ambulance Service (1990 Suwa Seriya)", number: "1990", category: "Medical" },
  { id: "4", name: "Police Emergency Operations", number: "119", category: "Police" },
  { id: "5", name: "Red Cross Sri Lanka Relief", number: "011-2691095", category: "Rescue" },
];

export const NEARBY_SHELTERS_DATA: ShelterItem[] = [
  { id: "SH-1", name: "Hanwella Rajasinghe Central College", distanceKm: 1.8, capacity: 500, occupancy: 340, locationName: "Hanwella, Kaduwela", phone: "036-2255100", lat: 6.9085, lon: 80.1388 },
  { id: "SH-2", name: "Avissawella Town Hall Shelter", distanceKm: 4.2, capacity: 300, occupancy: 120, locationName: "Avissawella", phone: "036-2222209", lat: 6.9535, lon: 80.2014 },
  { id: "SH-3", name: "Kaduwela Multipurpose Center", distanceKm: 6.5, capacity: 450, occupancy: 210, locationName: "Kaduwela", phone: "011-2571200", lat: 6.9312, lon: 79.9845 },
];

export const OFFICIAL_ALERTS_DATA = [
  {
    id: "ALT-001",
    title: "Major Flood Warning — Kelani River",
    station: "Hanwella",
    severity: "Critical",
    timeAgo: "15m ago",
    location: "Kaduwela, Kolonnawa & Biyagama Lowlands",
    message: "Water level at Hanwella station has reached major flood threshold. Residents in low-lying areas must move to designated shelters immediately.",
    actionAdvice: "Evacuate low-lying areas immediately. Move valuables to higher floors.",
  },
  {
    id: "ALT-002",
    title: "Heavy Rainfall Advisory",
    station: "Dunamale",
    severity: "Warning",
    timeAgo: "1h ago",
    location: "Gampaha & Attanagalla Basin",
    message: "Continuous heavy rainfall exceeding 100mm recorded in upper catchment. Moderate risk of flash flooding on local roads.",
    actionAdvice: "Avoid travelling across submerged roads. Keep emergency kit ready.",
  },
  {
    id: "ALT-003",
    title: "River Level Rising Notice",
    station: "Glencourse",
    severity: "Information",
    timeAgo: "3h ago",
    location: "Ruwanwella District",
    message: "Water levels at Glencourse station are steadily rising. Currently below minor flood level, but situation is under observation.",
    actionAdvice: "Stay tuned to DMC announcements and official broadcasts.",
  },
];
