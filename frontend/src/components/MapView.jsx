import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { STATION_COORDINATES, MAP_CENTER_SRI_LANKA, MAP_DEFAULT_ZOOM, MOCK_SHELTERS } from "../lib/constants";

// Helper to create custom circular markers for stations depending on risk level
function getStationIcon(riskLevel = "Low") {
  let color = "#22c55e"; // low -> green
  if (riskLevel === "Moderate") color = "#eab308"; // moderate -> yellow
  else if (riskLevel === "High") color = "#f97316"; // high -> orange
  else if (riskLevel === "Very High") color = "#ef4444"; // very high -> red

  const html = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: ${color}; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 12px; height: 12px; border-radius: 50%; background-color: ${color}; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-station-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// Helper to create custom markers for citizen reports
function getReportIcon(severity = "medium") {
  let color = "#f97316"; // medium -> orange
  if (severity === "minor") color = "#eab308"; // low/minor -> yellow
  else if (severity === "severe") color = "#ef4444"; // severe -> red
  else if (severity === "critical") color = "#b91c1c"; // critical -> dark red

  const html = `
    <div style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; background-color: ${color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); color: white; font-weight: bold; font-size: 14px;">
      ⚠
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-report-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

// Helper to create custom markers for shelters
function getShelterIcon() {
  const html = `
    <div style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background-color: #2563eb; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); color: white; font-size: 14px;">
      🏠
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-shelter-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// Map controller component to programmatically fly to location changes
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || MAP_DEFAULT_ZOOM);
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapView({
  stationsData = [],
  citizenReports = [],
  onSelectStation = () => {},
  selectedLocation = null,
  selectedZoom = null,
  showShelters = true,
  showReports = true
}) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner border border-slate-200">
      <MapContainer
        center={MAP_CENTER_SRI_LANKA}
        zoom={MAP_DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Dynamic Map Recenter */}
        <MapRecenter center={selectedLocation} zoom={selectedZoom} />

        {/* 1. Stations Markers */}
        {stationsData.map((station) => {
          const coords = STATION_COORDINATES[station.station];
          if (!coords) return null;

          return (
            <Marker
              key={station.station}
              position={[coords.lat, coords.lon]}
              icon={getStationIcon(station.risk_level)}
              eventHandlers={{
                click: () => onSelectStation(station),
              }}
            >
              <Popup>
                <div className="p-1 font-sans">
                  <h4 className="font-bold text-slate-800 text-sm">{station.station} Station</h4>
                  <p className="text-xs text-slate-500 font-semibold">{coords.river} • {station.river_basin || "River Basin"}</p>
                  <hr className="my-1.5 border-slate-100" />
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <span className="text-slate-500">Current Level:</span>
                    <span className="font-bold text-right text-slate-700">{station.current_water_level} m</span>
                    <span className="text-slate-500">Predicted Level:</span>
                    <span className="font-bold text-right text-blue-600">{station.predicted_water_level} m</span>
                    <span className="text-slate-500">Rainfall (12hr):</span>
                    <span className="font-bold text-right text-slate-700">{station.rainfall_12hr} mm</span>
                    <span className="text-slate-500">Risk Level:</span>
                    <span className={`font-bold text-right ${
                      station.risk_level === "Very High" ? "text-red-600" :
                      station.risk_level === "High" ? "text-orange-600" :
                      station.risk_level === "Moderate" ? "text-yellow-600" : "text-green-600"
                    }`}>{station.risk_level}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 2. Citizen Reports Markers */}
        {showReports && citizenReports.map((report) => {
          if (!report.latitude || !report.longitude) return null;

          return (
            <Marker
              key={report.id}
              position={[report.latitude, report.longitude]}
              icon={getReportIcon(report.severity)}
            >
              <Popup>
                <div className="p-1 font-sans max-w-[200px]">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-bold text-red-600 text-sm">Citizen Report</span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      report.severity === "critical" ? "bg-red-100 text-red-700" :
                      report.severity === "severe" ? "bg-orange-100 text-orange-700" :
                      report.severity === "moderate" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                    }`}>
                      {report.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-bold mt-1">{report.report_type}</p>
                  {report.description && <p className="text-xs text-slate-600 mt-1 italic">"{report.description}"</p>}
                  <hr className="my-1.5 border-slate-100" />
                  <div className="text-[10px] text-slate-400 flex justify-between">
                    <span>Status: {report.status || "new"}</span>
                    <span>{new Date(report.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 3. Emergency Shelters Markers */}
        {showShelters && MOCK_SHELTERS.map((shelter) => (
          <Marker
            key={shelter.id}
            position={[shelter.lat, shelter.lon]}
            icon={getShelterIcon()}
          >
            <Popup>
              <div className="p-1 font-sans">
                <span className="text-xs font-bold text-blue-600">Emergency Shelter</span>
                <h4 className="font-bold text-slate-800 text-sm mt-0.5">{shelter.name}</h4>
                <hr className="my-1.5 border-slate-100" />
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                  <span className="text-slate-500">Capacity:</span>
                  <span className="font-semibold text-slate-700 text-right">{shelter.capacity} people</span>
                  <span className="text-slate-500">Occupancy:</span>
                  <span className="font-semibold text-slate-700 text-right">{shelter.occupancy}</span>
                  <span className="text-slate-500">Availability:</span>
                  <span className="font-bold text-green-600 text-right">{shelter.capacity - shelter.occupancy} spots</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
