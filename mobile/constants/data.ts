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
