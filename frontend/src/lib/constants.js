// Station coordinates mapping in Sri Lanka
export const STATION_COORDINATES = {
  "Badalgama": { lat: 7.2883, lon: 79.9767, river: "Maha Oya" },
  "Baddegama": { lat: 6.1883, lon: 80.1983, river: "Gin Ganga" },
  "Calidonia": { lat: 6.9167, lon: 80.6833, river: "Kelani Ganga" },
  "Deraniyagala": { lat: 6.9333, lon: 80.4500, river: "Kelani Ganga" },
  "Dunamale": { lat: 7.1264, lon: 80.1583, river: "Attanagalu Oya" },
  "Ellagawa": { lat: 6.7725, lon: 80.2117, river: "Kalu Ganga" },
  "Galgamuwa": { lat: 7.9833, lon: 80.2667, river: "Miya Oya" },
  "Giriulla": { lat: 7.3167, lon: 80.1167, river: "Maha Oya" },
  "Glencourse": { lat: 6.9806, lon: 80.1872, river: "Kelani Ganga" },
  "Hanwella": { lat: 6.9069, lon: 80.1347, river: "Kelani Ganga" },
  "Holombuwa": { lat: 7.1856, lon: 80.2644, river: "Maha Oya" },
  "Horowpatana": { lat: 8.5833, lon: 80.8500, river: "Yan Oya" },
  "Horowpothana": { lat: 8.5833, lon: 80.8500, river: "Yan Oya" },
  "Kalawellawa (Millakanda)": { lat: 6.6333, lon: 80.1833, river: "Kalu Ganga" },
  "Katharagama": { lat: 6.4167, lon: 81.3333, river: "Menik Ganga" },
  "Kithulgala": { lat: 6.9881, lon: 80.4103, river: "Kelani Ganga" },
  "Kitulgala": { lat: 6.9881, lon: 80.4103, river: "Kelani Ganga" },
  "Kuda Oya": { lat: 6.5500, lon: 81.1167, river: "Kirindi Oya" },
  "Magura": { lat: 6.6000, lon: 80.2500, river: "Kuda Ganga" },
  "Manampitiya": { lat: 7.9167, lon: 81.1000, river: "Mahaweli Ganga" },
  "Putupaula": { lat: 6.6111, lon: 80.0833, river: "Kalu Ganga" },
  "Rathnapura": { lat: 6.6828, lon: 80.3992, river: "Kalu Ganga" }
};

// Default center for Sri Lanka on Leaflet
export const MAP_CENTER_SRI_LANKA = [7.8731, 80.7718];
export const MAP_DEFAULT_ZOOM = 8;

// ML Performance Metrics
export const ML_MODELS_PERFORMANCE = {
  "RF + GB Hybrid": {
    name: "RF + GB Hybrid (Selected)",
    mae: 0.403,
    rmse: 0.7423,
    r2: 0.9149,
    status: "Active Deployment",
    description: "Weighted hybrid model combining Random Forest and Gradient Boosting. Highest accuracy and robustness."
  },
  "Random Forest": {
    name: "Random Forest (Comparison)",
    mae: 0.411,
    rmse: 0.7445,
    r2: 0.9144,
    status: "Secondary Model",
    description: "Robust ensemble method optimized with lag features. High stability in extreme values."
  },
  "XGBoost": {
    name: "XGBoost (Comparison)",
    mae: 0.452,
    rmse: 0.812,
    r2: 0.887,
    status: "Tertiary Model",
    description: "Gradient boosted tree model. Fast convergence, but slightly lower accuracy on lag structures."
  }
};

// Predefined alerts database (Mock storage for current semester)
export const MOCK_ALERTS = [
  {
    id: "AL001",
    title: "Major Flood Warning",
    station: "Hanwella",
    river: "Kelani Ganga",
    message: "Water levels at Hanwella station have crossed the major flood threshold (4.6m). Immediate evacuation of low-lying areas is advised.",
    severity: "Very High",
    time: "2026-08-20T10:00:00Z",
    location: "Hanwella, Kaduwela, Kolonnawa districts",
    status: "Active"
  },
  {
    id: "AL002",
    title: "River Level Alert",
    station: "Glencourse",
    river: "Kelani Ganga",
    message: "Water levels are rising rapidly at Glencourse due to heavy upstream rainfall. Moderate flood threat in adjacent low lands.",
    severity: "Moderate",
    time: "2026-08-20T08:30:00Z",
    location: "Ruwanwella, Avissawella",
    status: "Active"
  },
  {
    id: "AL003",
    title: "Heavy Rainfall Advisory",
    station: "Dunamale",
    river: "Attanagalu Oya",
    message: "Rainfall exceeding 150mm recorded. Residents should stay alert for localized flash floods.",
    severity: "High",
    time: "2026-08-20T07:15:00Z",
    location: "Gampaha, Dunamale",
    status: "Active"
  }
];

// Predefined Rescue resources & shelters
export const MOCK_SHELTERS = [
  { id: "SH001", name: "Hanwella Rajasinghe Central College", lat: 6.9085, lon: 80.1388, capacity: 500, occupancy: 340, status: "Active" },
  { id: "SH002", name: "Avissawella Town Hall", lat: 6.9535, lon: 80.2014, capacity: 300, occupancy: 120, status: "Active" },
  { id: "SH003", name: "Rathnapura Buddhist Center", lat: 6.6850, lon: 80.3950, capacity: 400, occupancy: 380, status: "Active" },
  { id: "SH004", name: "Gampaha Yashodhara Devi Balika Vidyalaya", lat: 7.0897, lon: 80.0034, capacity: 250, occupancy: 50, status: "Active" }
];

export const MOCK_RESOURCES = [
  { id: "RT001", name: "Navy Rescue Team 01 (Colombo)", type: "Rescue Team", status: "Busy", details: "Currently deployed at Hanwella" },
  { id: "RT002", name: "DMC Relief Center Team A (Ratnapura)", type: "Relief Team", status: "Available", details: "On standby at Rathnapura base" },
  { id: "RT003", name: "Army Medical Division Unit 3", type: "Medical Unit", status: "Available", details: "On standby at Avissawella base" },
  { id: "RV004", name: "Inflatable Rescue Boat Division", type: "Boats", status: "Busy", details: "12 boats deployed in Kaduwela" }
];
