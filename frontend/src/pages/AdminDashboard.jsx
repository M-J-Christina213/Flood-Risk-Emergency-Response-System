import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  CloudRain,
  Map as MapIcon,
  BellRing,
  Users,
  Home as HomeIcon,
  Search,
  CheckCircle,
  AlertOctagon,
  LifeBuoy,
  Settings,
  Radio,
  ExternalLink,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  SlidersHorizontal,
  Download,
  ShieldCheck,
  Flame
} from "lucide-react";
import {
  fetchHealth,
  fetchStations,
  fetchStationInfo,
  fetchCitizenReports,
  submitCitizenReport,
  fetchPriorityAreas
} from "../services/api";
import {
  STATION_COORDINATES,
  ML_MODELS_PERFORMANCE,
  MOCK_ALERTS,
  MOCK_SHELTERS,
  MOCK_RESOURCES
} from "../lib/constants";
import MapView from "../components/MapView";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time API States
  const [apiHealth, setApiHealth] = useState({ status: "offline", model_loaded: false, dataset_loaded: false, stations: 0 });
  const [stations, setStations] = useState([]);
  const [stationsData, setStationsData] = useState([]);
  const [citizenReports, setCitizenReports] = useState([]);

  // Interactive UI States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRiver, setSelectedRiver] = useState("All");
  const [selectedRisk, setSelectedRisk] = useState("All");
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedZoom, setSelectedZoom] = useState(null);

  // Mock State Managers (for Admin operations in UI)
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [shelters, setShelters] = useState(MOCK_SHELTERS);
  const [resources, setResources] = useState(MOCK_RESOURCES);
  const [selectedModel, setSelectedModel] = useState("Random Forest");
  const [priorityAreas, setPriorityAreas] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Create alert form state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    title: "",
    station: "",
    river: "",
    message: "",
    severity: "High",
    location: ""
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Health
      const health = await fetchHealth();
      setApiHealth(health);

      // 2. Fetch Stations List
      const stationsListRes = await fetchStations();
      setStations(stationsListRes.stations);

      // 3. Fetch detailed data for each station
      const detailedData = [];
      const stationsToFetch = stationsListRes.stations.slice(0, 15); // Load first 15 to keep dashboard responsive

      for (const stationName of stationsToFetch) {
        const info = await fetchStationInfo(stationName);
        if (info) {
          detailedData.push(info);
        }
      }
      setStationsData(detailedData);

      // 4. Fetch Citizen Reports
      const reportsRes = await fetchCitizenReports();
      setCitizenReports(reportsRes.reports || []);

      // 5. Fetch Priority Areas
      const priorityRes = await fetchPriorityAreas();
      setPriorityAreas(priorityRes.priority_areas || []);

    } catch (err) {
      console.error("Dashboard data fetching failed:", err);
      setError("Failed to connect to the backend server. Please make sure the FastAPI server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Live clock — updates every second
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleSelectStationOnMap = (station) => {
    const coords = STATION_COORDINATES[station.station];
    if (coords) {
      setSelectedLocation([coords.lat, coords.lon]);
      setSelectedZoom(12);
      setSelectedStation(station);
    }
  };

  const handleUpdateReportStatus = (reportId, newStatus) => {
    setCitizenReports(prevReports =>
      prevReports.map(report =>
        report.id === reportId ? { ...report, status: newStatus } : report
      )
    );
  };

  const handleCreateAlert = (e) => {
    e.preventDefault();
    const alertObj = {
      id: `AL${Date.now().toString().slice(-3)}`,
      title: newAlert.title,
      station: newAlert.station || "Manual Entry",
      river: newAlert.river,
      message: newAlert.message,
      severity: newAlert.severity,
      time: new Date().toISOString(),
      location: newAlert.location,
      status: "Active"
    };

    setAlerts([alertObj, ...alerts]);
    setShowAlertModal(false);
    setNewAlert({ title: "", station: "", river: "", message: "", severity: "High", location: "" });
  };

  const handleDeleteAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const handleUpdateShelterOccupancy = (shelterId, increment) => {
    setShelters(prevShelters =>
      prevShelters.map(shelter => {
        if (shelter.id === shelterId) {
          const newOccupancy = Math.max(0, Math.min(shelter.capacity, shelter.occupancy + increment));
          return { ...shelter, occupancy: newOccupancy };
        }
        return shelter;
      })
    );
  };

  const handleUpdateResourceStatus = (resourceId, newStatus) => {
    setResources(prevResources =>
      prevResources.map(res =>
        res.id === resourceId ? { ...res, status: newStatus } : res
      )
    );
  };

  // Filters calculation
  const uniqueRivers = ["All", ...new Set(stationsData.map(s => s.river).filter(Boolean))];

  const filteredStations = stationsData.filter(s => {
    const matchesSearch = s.station.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.river && s.river.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRiver = selectedRiver === "All" || s.river === selectedRiver;
    const matchesRisk = selectedRisk === "All" || s.risk_level === selectedRisk;
    return matchesSearch && matchesRiver && matchesRisk;
  });

  // KPI Calculations
  const totalMonitoredStations = stationsData.length;
  const highRiskCount = stationsData.filter(s => s.risk_level === "High" || s.risk_level === "Very High").length;
  const activeAlertsCount = alerts.filter(a => a.status === "Active").length;
  const newReportsCount = citizenReports.filter(r => r.status === "new").length;

  // Risk breakdown counts
  const lowCount = stationsData.filter(s => s.risk_level === "Low").length;
  const moderateCount = stationsData.filter(s => s.risk_level === "Moderate").length;
  const highOnlyCount = stationsData.filter(s => s.risk_level === "High").length;
  const veryHighCount = stationsData.filter(s => s.risk_level === "Very High").length;

  // Formatted Colombo time
  const colomboTime = currentTime.toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  const lastPredictionTime = stationsData.length > 0 && stationsData[0].prediction_generated_at
    ? new Date(stationsData[0].prediction_generated_at).toLocaleString("en-LK", {
      timeZone: "Asia/Colombo",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
    : "--";

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-80 bg-[#0f172a] text-slate-300 flex flex-col z-20 shadow-2xl border-r border-slate-800">

        {/* DMC Logo header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white animate-pulse">
            <Radio size={24} />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-tight leading-tight">DMC Command Centre</h1>
            <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">Sri Lanka Flood Response</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "overview"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("prediction")}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "prediction"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <TrendingUp size={20} />
            <span>Flood Risk Prediction</span>
          </button>

          <button
            onClick={() => setActiveTab("monitoring")}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "monitoring"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <Activity size={20} />
            <span>Live River Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab("rainfall")}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "rainfall"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <CloudRain size={20} />
            <span>Rainfall Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab("map")}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "map"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <MapIcon size={20} />
            <span>GIS Risk Map</span>
          </button>

          <div className="h-px bg-slate-800/80 my-4"></div>

          <button
            onClick={() => setActiveTab("alerts")}
            className={`w-full flex items-center justify-between px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "alerts"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <BellRing size={20} />
              <span>Emergency Alerts</span>
            </div>
            {activeAlertsCount > 0 && (
              <span className="bg-red-500 text-white font-bold text-xs px-2 py-0.5 rounded-full">{activeAlertsCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`w-full flex items-center justify-between px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "reports"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <AlertOctagon size={20} />
              <span>Citizen Reports</span>
            </div>
            {newReportsCount > 0 && (
              <span className="bg-orange-500 text-white font-bold text-xs px-2 py-0.5 rounded-full animate-bounce">{newReportsCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("shelters")}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "shelters"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <HomeIcon size={20} />
            <span>Shelters Directory</span>
          </button>

          <button
            onClick={() => setActiveTab("resources")}
            className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl font-medium transition-all duration-200 ${activeTab === "resources"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "hover:bg-slate-800/60 hover:text-white text-slate-400"
              }`}
          >
            <LifeBuoy size={20} />
            <span>Rescue Resources</span>
          </button>
        </nav>

        {/* System parameters */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 text-slate-500 text-xs font-medium space-y-3">
          <div className="flex justify-between items-center">
            <span>FastAPI Server:</span>
            <span className={`font-bold flex items-center gap-1.5 ${apiHealth.status === "healthy" ? "text-green-500" : "text-red-500"}`}>
              <span className={`w-2 h-2 rounded-full ${apiHealth.status === "healthy" ? "bg-green-500" : "bg-red-500"}`}></span>
              {apiHealth.status === "healthy" ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="text-slate-300 font-bold">Random Forest</span>
          </div>
          <div className="flex justify-between">
            <span>Stations served:</span>
            <span className="text-slate-300 font-bold">{apiHealth.stations || "55"}</span>
          </div>
          <p className="text-[10px] text-slate-600 text-center pt-2">© 2026 Disaster Management Center</p>
        </div>

      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* TOP NAVBAR */}
        <header className="h-20 bg-white border-b border-slate-200 px-8 flex justify-between items-center shrink-0 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2.5">
              {activeTab === "overview" && "Dashboard Overview"}
              {activeTab === "prediction" && "Flood Risk Prediction"}
              {activeTab === "monitoring" && "Live River Monitoring"}
              {activeTab === "rainfall" && "Rainfall Monitoring"}
              {activeTab === "map" && "GIS Flood Risk Map"}
              {activeTab === "alerts" && "Emergency Alerts Management"}
              {activeTab === "reports" && "Citizen Incident Reports"}
              {activeTab === "shelters" && "DMC Emergency Shelters"}
              {activeTab === "resources" && "Rescue Resources Directory"}
            </h2>
            <p className="text-xs text-slate-400 font-medium">Sri Lanka Flood-Risk-Emergency-Response-System</p>
          </div>
          {/* Live Clock */}
          <div className="flex items-center gap-4">
            <div className="text-right border-r border-slate-200 pr-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">System Time (Sri Lanka)</p>
              <p className="text-sm font-extrabold text-slate-700 font-mono">{colomboTime}</p>
              <p className="text-[10px] text-slate-400">Last prediction: {lastPredictionTime}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2.5 text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:text-slate-800 rounded-xl transition duration-200 flex items-center gap-1.5 text-sm font-semibold"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span>Sync Live Data</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm shadow-sm">
                DMC
              </div>
              <div className="leading-tight">
                <span className="block font-bold text-sm text-slate-800">DMC Officer</span>
                <span className="block text-[10px] font-semibold text-slate-400">Duty Commander</span>
              </div>
            </div>
          </div>
        </header>

        {/* CENTRAL SCREEN AREA */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">

          {error && (
            <div className="mb-6 p-4.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-3.5 shadow-sm">
              <span className="text-xl">⚠</span>
              <div>
                <p className="font-bold text-red-800">API Connection Offline</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* ======================================================================
              TAB: OVERVIEW
              ====================================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                    <Activity size={26} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Stations Serving</span>
                    <strong className="block text-3xl font-extrabold text-slate-800 mt-0.5">
                      {loading ? "--" : totalMonitoredStations || apiHealth.stations}
                    </strong>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition">
                  <div className="p-4 bg-red-50 text-red-500 rounded-xl">
                    <AlertOctagon size={26} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">High Risk Stations</span>
                    <strong className="block text-3xl font-extrabold text-red-600 mt-0.5">
                      {loading ? "--" : highRiskCount}
                    </strong>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition">
                  <div className="p-4 bg-orange-50 text-orange-500 rounded-xl">
                    <BellRing size={26} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Alerts</span>
                    <strong className="block text-3xl font-extrabold text-orange-600 mt-0.5">
                      {activeAlertsCount}
                    </strong>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Users size={26} />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Citizen Reports</span>
                    <strong className="block text-3xl font-extrabold text-emerald-600 mt-0.5">
                      {citizenReports.length}
                    </strong>
                  </div>
                </div>

              </div>



              {/* Map & Live River Monitoring Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Leaflet Map Panel */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">DMC Operational Flood Map</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Real-time status of stations, reports and shelters in Sri Lanka</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("map")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      Fullscreen Map <ExternalLink size={12} />
                    </button>
                  </div>

                  <div className="flex-1 bg-slate-50 rounded-xl overflow-hidden relative">
                    <MapView
                      stationsData={stationsData}
                      citizenReports={citizenReports}
                      onSelectStation={handleSelectStationOnMap}
                      selectedLocation={selectedLocation}
                      selectedZoom={selectedZoom}
                    />
                  </div>
                </div>

                {/* Live River Monitoring Table panel */}
                <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px]">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">Live Station Feeds</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Current vs Predicted water levels (Random Forest model)</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("monitoring")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      View All Stations <ExternalLink size={12} />
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto space-y-3.5 pr-1">
                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse"></div>
                        ))}
                      </div>
                    ) : filteredStations.length === 0 ? (
                      <div className="h-full flex items-center justify-center flex-col text-slate-400">
                        <Activity size={40} className="stroke-[1.5] mb-2" />
                        <span className="text-sm font-semibold">No stations currently active</span>
                      </div>
                    ) : (
                      filteredStations.slice(0, 8).map((station) => (
                        <div
                          key={station.station}
                          onClick={() => handleSelectStationOnMap(station)}
                          className={`p-4 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer rounded-xl transition duration-200 flex items-center justify-between ${selectedStation?.station === station.station ? "border-blue-500 bg-blue-50/30" : ""
                            }`}
                        >
                          <div>
                            <span className="font-bold text-slate-800 text-sm block">{station.station}</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">{station.river || "Kelani Ganga"}</span>
                          </div>

                          <div className="flex items-center gap-5 text-right">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">CURRENT</span>
                              <strong className="text-slate-700 text-sm font-extrabold">{station.current_water_level}m</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-blue-400 block font-semibold">PREDICTED</span>
                              <strong className="text-blue-600 text-sm font-extrabold">{station.predicted_water_level}m</strong>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${station.risk_level === "Very High" ? "bg-red-100 text-red-700" :
                              station.risk_level === "High" ? "bg-orange-100 text-orange-700" :
                                station.risk_level === "Moderate" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                              }`}>
                              {station.risk_level}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* PRIORITY AREAS PANEL */}
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse inline-block"></span>
                      Priority Response Areas
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Areas with High or Very High predicted flood risk requiring prioritised attention. Sorted by severity. Supports response resource coordination.</p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1 rounded-full">{priorityAreas.length} areas flagged</span>
                </div>
                {priorityAreas.length === 0 ? (
                  <div className="flex items-center justify-center h-20 text-slate-400 text-sm font-semibold">
                    <CheckCircle size={20} className="mr-2 text-green-500" /> No High or Very High risk areas currently detected.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {priorityAreas.map((area, idx) => (
                      <div
                        key={area.station + idx}
                        className={`p-4 rounded-xl border flex items-start gap-3 ${area.risk_level === "Very High"
                          ? "bg-red-50 border-red-300"
                          : "bg-orange-50 border-orange-300"
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${area.risk_level === "Very High" ? "bg-red-200 text-red-800" : "bg-orange-200 text-orange-800"
                          }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{area.station}</p>
                          <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${area.risk_level === "Very High" ? "bg-red-200 text-red-800" : "bg-orange-200 text-orange-800"
                            }`}>{area.risk_level} RISK</span>
                          <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                            <p>Predicted level: <strong className="text-slate-700">{area.predicted_water_level?.toFixed(2)}m</strong></p>
                            {area.prediction_time && (
                              <p>Data observation: <strong className="text-slate-600">{new Date(area.prediction_time).toLocaleString("en-LK", { timeZone: "Asia/Colombo", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}</strong></p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Row - Alerts & Rainfall Metrics Split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


                {/* Active Alerts List */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">Critical Alerts Feed</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Currently broadcasted early warnings</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("alerts")}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      Manage Alerts <ExternalLink size={12} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-xl border flex items-start gap-4 ${alert.severity === "Very High" ? "bg-red-50/50 border-red-200" :
                          alert.severity === "High" ? "bg-orange-50/50 border-orange-200" : "bg-yellow-50/50 border-yellow-200"
                          }`}
                      >
                        <div className={`p-2 rounded-lg mt-0.5 ${alert.severity === "Very High" ? "bg-red-100 text-red-600" :
                          alert.severity === "High" ? "bg-orange-100 text-orange-600" : "bg-yellow-100 text-yellow-600"
                          }`}>
                          <AlertOctagon size={18} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-bold text-slate-800 text-sm">{alert.title}</h4>
                            <span className="text-[10px] text-slate-400 font-semibold">{new Date(alert.time).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 font-semibold">{alert.location}</p>
                          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Rainfall History Chart Panel (Custom SVG) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Rainfall Levels (12-Hour)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Precipitation metrics across active monitoring stations</p>
                  </div>

                  <div className="flex-1 flex items-end justify-between gap-2 mt-8 px-4 relative">

                    {/* Y-axis indicator lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-slate-400 font-bold border-b border-slate-100 pb-8">
                      <div className="border-t border-dashed border-slate-100 w-full pt-0.5">100 mm</div>
                      <div className="border-t border-dashed border-slate-100 w-full pt-0.5">75 mm</div>
                      <div className="border-t border-dashed border-slate-100 w-full pt-0.5">50 mm</div>
                      <div className="border-t border-dashed border-slate-100 w-full pt-0.5">25 mm</div>
                    </div>

                    {loading ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">Loading chart...</div>
                    ) : stationsData.slice(0, 10).map((station) => {
                      const percentage = Math.min(100, (station.rainfall_12hr / 100) * 100);
                      return (
                        <div key={station.station} className="flex-1 flex flex-col items-center gap-2 group z-10">
                          <div className="w-full relative h-40 bg-slate-50 rounded-lg flex items-end">
                            <div
                              style={{ height: `${percentage}%` }}
                              className="w-full bg-blue-500 group-hover:bg-blue-600 rounded-md transition-all duration-300 relative"
                            >
                              {/* Hover Tooltip */}
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-20 transition duration-200">
                                {station.rainfall_12hr} mm
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold text-center block w-full truncate">{station.station}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ======================================================================
              TAB: PREDICTION
              ====================================================================== */}
          {activeTab === "prediction" && (
            <div className="space-y-6">

              {/* Analytics Top */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Model selection info */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-blue-600 font-extrabold uppercase tracking-wider">Predictive Modeling</span>
                    <h3 className="font-extrabold text-xl text-slate-800 mt-1">Water-Level ML Prediction</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      The system uses water-level lag structures, moving averages, and cyclical temporal elements to predict river levels.
                    </p>

                    <div className="mt-6 space-y-3">
                      <label className="block text-xs font-bold text-slate-500">Current Model Target</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedModel("RF + GB Hybrid")}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition duration-200 ${selectedModel === "RF + GB Hybrid"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                        >
                          RF+GB Hybrid
                        </button>
                        <button
                          onClick={() => setSelectedModel("Random Forest")}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition duration-200 ${selectedModel === "Random Forest"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                        >
                          Random Forest
                        </button>
                        <button
                          onClick={() => setSelectedModel("XGBoost")}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition duration-200 ${selectedModel === "XGBoost"
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                            }`}
                        >
                          XGBoost
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-500 font-semibold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
                    <span>Ready for next-hour predict trigger</span>
                  </div>
                </div>

                {/* Model performance metrics cards */}
                {Object.entries(ML_MODELS_PERFORMANCE).map(([key, value]) => (
                  <div
                    key={key}
                    className={`bg-white p-6 rounded-2xl border transition duration-200 flex flex-col justify-between ${selectedModel === key ? "border-blue-500 shadow-md ring-1 ring-blue-500/30" : "border-slate-200 shadow-sm"
                      }`}
                  >
                    <div>
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 text-sm">{value.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${key === "Random Forest" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                          }`}>{value.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">{value.description}</p>

                      <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">MAE</span>
                          <strong className="block text-lg font-extrabold text-slate-800 mt-0.5">{value.mae}</strong>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">RMSE</span>
                          <strong className="block text-lg font-extrabold text-slate-800 mt-0.5">{value.rmse}</strong>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">R²</span>
                          <strong className="block text-lg font-extrabold text-slate-800 mt-0.5">{value.r2}</strong>
                        </div>
                      </div>
                    </div>

                    <button className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 mt-6 flex items-center justify-center gap-1.5 transition">
                      <Download size={14} /> Export Validation Log
                    </button>
                  </div>
                ))}

              </div>

              {/* Prediction Table & Actual vs Predicted Comparison Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* SVG Prediction Trend Chart */}
                <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Actual vs Predicted Trend</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Water level monitoring comparison (m) across stations</p>
                  </div>

                  <div className="flex-1 flex items-end justify-between gap-6 mt-12 px-6 relative">

                    {/* Axis indicators */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-slate-400 font-bold border-b border-slate-100 pb-8">
                      <div className="border-t border-dashed border-slate-100 w-full pt-0.5">12.0 m (Major Limit)</div>
                      <div className="border-t border-dashed border-slate-100 w-full pt-0.5">8.0 m</div>
                      <div className="border-t border-dashed border-slate-100 w-full pt-0.5 font-semibold text-yellow-600">4.0 m (Alert Limit)</div>
                      <div className="border-t border-dashed border-slate-100 w-full pt-0.5">0.0 m</div>
                    </div>

                    {loading ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">Loading chart...</div>
                    ) : stationsData.slice(0, 8).map((station) => {
                      const actualHeight = Math.min(100, (station.current_water_level / 12) * 100);
                      const predictedHeight = Math.min(100, (station.predicted_water_level / 12) * 100);
                      return (
                        <div key={station.station} className="flex-1 flex flex-col items-center gap-2 group z-10">
                          <div className="w-full flex items-end justify-center gap-1.5 h-44 bg-slate-50/50 rounded-xl p-1">
                            {/* Actual column */}
                            <div
                              style={{ height: `${actualHeight}%` }}
                              className="w-4 bg-slate-300 group-hover:bg-slate-400 rounded-t-sm transition-all duration-300 relative"
                            >
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                                Act: {station.current_water_level}m
                              </div>
                            </div>
                            {/* Predicted column */}
                            <div
                              style={{ height: `${predictedHeight}%` }}
                              className="w-4 bg-blue-500 group-hover:bg-blue-600 rounded-t-sm transition-all duration-300 relative"
                            >
                              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-700 text-white text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                                Pred: {station.predicted_water_level}m
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold block truncate w-full text-center">{station.station}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-center gap-6 mt-4 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-slate-300 rounded-sm"></div>
                      <span>Actual Water Level</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                      <span>Predicted Level (RF model)</span>
                    </div>
                  </div>
                </div>

                {/* Explanation text panel */}
                <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-[400px]">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">Prediction Engine Details</h3>
                    <p className="text-xs text-slate-400 mt-0.5">How the ML model calculates predictions</p>

                    <div className="mt-6 space-y-4 text-xs text-slate-600 leading-relaxed">
                      <p>
                        <strong>1. Feature Input:</strong> Receives current levels, rolling means, rainfall levels (12h), and time parameters.
                      </p>
                      <p>
                        <strong>2. Next-step forecasting:</strong> Random Forest model forecasts next-hour level.
                      </p>
                      <p>
                        <strong>3. Risk mapping:</strong> Classifies risk based on station-specific minor/major flood levels defined by Sri Lanka Irrigation Department.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 mt-4">
                    <span className="text-lg text-amber-500">ℹ</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      All calculations are performed on the FastAPI server instance. Real-world stations coordinates will enable distance-based matching later.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ======================================================================
              TAB: LIVE RIVER MONITORING
              ====================================================================== */}
          {activeTab === "monitoring" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

              {/* Header and filters */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search stations, rivers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 shadow-sm transition"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase">Filters</span>
                  </div>

                  {/* River Selector */}
                  <select
                    value={selectedRiver}
                    onChange={(e) => setSelectedRiver(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 shadow-sm"
                  >
                    <option value="All">All Rivers</option>
                    {uniqueRivers.filter(r => r !== "All").map(river => (
                      <option key={river} value={river}>{river}</option>
                    ))}
                  </select>

                  {/* Risk Selector */}
                  <select
                    value={selectedRisk}
                    onChange={(e) => setSelectedRisk(e.target.value)}
                    className="bg-white border border-slate-200 text-xs font-semibold px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 shadow-sm"
                  >
                    <option value="All">All Risks</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/40 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-4.5 px-6">Station Name</th>
                      <th className="py-4.5 px-6">River</th>
                      <th className="py-4.5 px-6">Basin</th>
                      <th className="py-4.5 px-6 text-center">Current Level (m)</th>
                      <th className="py-4.5 px-6 text-center">Predicted Level (m)</th>
                      <th className="py-4.5 px-6 text-center">Rainfall (12h)</th>
                      <th className="py-4.5 px-6 text-center">Alert Limit</th>
                      <th className="py-4.5 px-6 text-center">Major Limit</th>
                      <th className="py-4.5 px-6 text-center">Risk Level</th>
                      <th className="py-4.5 px-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {loading ? (
                      [1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={10} className="py-6 px-6"><div className="h-6 bg-slate-100 rounded"></div></td>
                        </tr>
                      ))
                    ) : filteredStations.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                          No stations matching filters found.
                        </td>
                      </tr>
                    ) : (
                      filteredStations.map((station) => (
                        <tr key={station.station} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-6 font-bold text-slate-900">{station.station}</td>
                          <td className="py-4 px-6 font-semibold text-slate-500">{station.river || "--"}</td>
                          <td className="py-4 px-6 text-slate-400">{station.river_basin || "--"}</td>
                          <td className="py-4 px-6 font-extrabold text-center text-slate-800">{station.current_water_level}m</td>
                          <td className="py-4 px-6 font-extrabold text-center text-blue-600 bg-blue-50/10">{station.predicted_water_level}m</td>
                          <td className="py-4 px-6 text-center text-slate-600 font-semibold">{station.rainfall_12hr} mm</td>
                          <td className="py-4 px-6 text-center text-slate-400">{station.alert_level || "--"}m</td>
                          <td className="py-4 px-6 text-center text-slate-400">{station.major_flood_level || "--"}m</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold inline-block ${station.risk_level === "Very High" ? "bg-red-100 text-red-700" :
                              station.risk_level === "High" ? "bg-orange-100 text-orange-700" :
                                station.risk_level === "Moderate" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                              }`}>
                              {station.risk_level}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => {
                                handleSelectStationOnMap(station);
                                setActiveTab("map");
                              }}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 mx-auto"
                            >
                              Show Map <ExternalLink size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ======================================================================
              TAB: RAINFALL MONITORING
              ====================================================================== */}
          {activeTab === "rainfall" && (
            <div className="space-y-6">

              {/* Rainfall Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Precipitation Log (Past 12 Hours)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Recorded rainfall in millimeters across major station networks</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {stationsData.map((station) => (
                    <div key={station.station} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{station.station}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">{station.river || "Kelani Ganga"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block">12H PRECIP</span>
                        <strong className="text-blue-600 font-extrabold text-lg">{station.rainfall_12hr} mm</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ======================================================================
              TAB: GIS RISK MAP
              ====================================================================== */}
          {activeTab === "map" && (

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-140px)]">

              {/* Map Header */}
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">GIS Flood Risk Map — Sri Lanka Command</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Comprehensive view of river stations, shelters, and citizen incidents</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                    <span>Shelters</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                    <span>Incidents</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                    <span>Monitoring Stations</span>
                  </div>
                </div>
              </div>

              {/* Risk Breakdown Strip */}
              <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
                <div className="bg-green-50 p-5 rounded-2xl border border-green-200 shadow-sm flex items-center gap-5 hover:shadow-md transition">
                  <div className="p-3.5 bg-green-100 text-green-600 rounded-xl shrink-0">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-green-600 font-bold uppercase tracking-wider">Low Risk</span>
                    <strong className="block text-3xl font-extrabold text-green-700 mt-0.5">{loading ? "--" : lowCount}</strong>
                  </div>
                </div>
                <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-200 shadow-sm flex items-center gap-5 hover:shadow-md transition">
                  <div className="p-3.5 bg-yellow-100 text-yellow-600 rounded-xl shrink-0">
                    <Activity size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-yellow-600 font-bold uppercase tracking-wider">Moderate</span>
                    <strong className="block text-3xl font-extrabold text-yellow-700 mt-0.5">{loading ? "--" : moderateCount}</strong>
                  </div>
                </div>
                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-200 shadow-sm flex items-center gap-5 hover:shadow-md transition">
                  <div className="p-3.5 bg-orange-100 text-orange-600 rounded-xl shrink-0">
                    <AlertOctagon size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-orange-600 font-bold uppercase tracking-wider">High Risk</span>
                    <strong className="block text-3xl font-extrabold text-orange-700 mt-0.5">{loading ? "--" : highOnlyCount}</strong>
                  </div>
                </div>
                <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm flex items-center gap-5 hover:shadow-md transition">
                  <div className="p-3.5 bg-red-100 text-red-600 rounded-xl shrink-0">
                    <Flame size={22} />
                  </div>
                  <div>
                    <span className="text-xs text-red-600 font-bold uppercase tracking-wider">Very High</span>
                    <strong className="block text-3xl font-extrabold text-red-700 mt-0.5">{loading ? "--" : veryHighCount}</strong>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="flex-1 bg-slate-50 rounded-xl overflow-hidden relative">
                <MapView
                  stationsData={stationsData}
                  citizenReports={citizenReports}
                  onSelectStation={handleSelectStationOnMap}
                  selectedLocation={selectedLocation}
                  selectedZoom={selectedZoom}
                />
              </div>
            </div>
          )}

          {/* ======================================================================
              TAB: ALERTS
              ====================================================================== */}
          {activeTab === "alerts" && (
            <div className="space-y-6">

              {/* Header card with action */}
              <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">DMC Warning Broadcasts</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Broadcast localized early warnings to the public mobile application</p>
                </div>
                <button
                  onClick={() => setShowAlertModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4.5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20 transition duration-200"
                >
                  <Plus size={16} /> Broadcast New Warning
                </button>
              </div>

              {/* Alerts List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-black text-slate-800 text-base">{alert.title}</h4>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">ID: {alert.id} • Issued: {new Date(alert.time).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${alert.severity === "Very High" ? "bg-red-100 text-red-700" :
                          alert.severity === "High" ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                          {alert.severity} Risk
                        </span>
                      </div>

                      <hr className="my-4 border-slate-100" />

                      <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-400">Target Area:</span>
                          <span className="text-slate-800 text-right">{alert.location}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-400">Trigger Station:</span>
                          <span className="text-slate-800 text-right">{alert.station} ({alert.river})</span>
                        </div>
                        <div className="mt-4 pt-2 text-slate-600 leading-relaxed border-t border-slate-50">
                          {alert.message}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl transition flex items-center gap-1.5"
                      >
                        <Trash2 size={14} /> Revoke Warning
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ======================================================================
              TAB: REPORTS
              ====================================================================== */}
          {activeTab === "reports" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">

              <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                <h3 className="font-bold text-lg text-slate-800">Incoming Citizen Incidents Feed</h3>
                <p className="text-xs text-slate-400 mt-0.5">Validate reports submitted by the public for authority coordination</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/40 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-4.5 px-6">Report ID</th>
                      <th className="py-4.5 px-6">Incident Category</th>
                      <th className="py-4.5 px-6">Location (Lat, Lon)</th>
                      <th className="py-4.5 px-6 text-center">Severity</th>
                      <th className="py-4.5 px-6">Description</th>
                      <th className="py-4.5 px-6 text-center">Submitted At</th>
                      <th className="py-4.5 px-6 text-center">Current Status</th>
                      <th className="py-4.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {citizenReports.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                          No citizen incident reports logged.
                        </td>
                      </tr>
                    ) : (
                      citizenReports.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50/30 transition">
                          <td className="py-4.5 px-6 font-bold text-slate-500">#{report.id.slice(-6)}</td>
                          <td className="py-4.5 px-6 font-extrabold text-slate-800">{report.report_type}</td>
                          <td className="py-4.5 px-6 text-xs text-slate-500 font-semibold">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</td>
                          <td className="py-4.5 px-6 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${report.severity === "critical" ? "bg-red-100 text-red-700" :
                              report.severity === "severe" ? "bg-orange-100 text-orange-700" :
                                report.severity === "moderate" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                              }`}>
                              {report.severity}
                            </span>
                          </td>
                          <td className="py-4.5 px-6 text-slate-600 max-w-[200px] truncate">{report.description || "--"}</td>
                          <td className="py-4.5 px-6 text-center text-xs text-slate-400 font-medium">
                            {new Date(report.submitted_at).toLocaleDateString()} {new Date(report.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4.5 px-6 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${report.status === "new" ? "bg-blue-100 text-blue-700" :
                              report.status === "verified" ? "bg-amber-100 text-amber-700" :
                                report.status === "dispatched" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                              }`}>
                              {report.status}
                            </span>
                          </td>
                          <td className="py-4.5 px-6 text-right space-x-2">
                            {report.status === "new" && (
                              <button
                                onClick={() => handleUpdateReportStatus(report.id, "verified")}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-amber-200 transition"
                              >
                                Verify
                              </button>
                            )}
                            {report.status === "verified" && (
                              <button
                                onClick={() => handleUpdateReportStatus(report.id, "dispatched")}
                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-purple-200 transition"
                              >
                                Dispatch Rescue
                              </button>
                            )}
                            {report.status === "dispatched" && (
                              <button
                                onClick={() => handleUpdateReportStatus(report.id, "resolved")}
                                className="bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-green-200 transition"
                              >
                                Resolve
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedLocation([report.latitude, report.longitude]);
                                setSelectedZoom(14);
                                setActiveTab("map");
                              }}
                              className="text-xs font-bold text-slate-400 hover:text-slate-800 transition px-2 py-1.5"
                            >
                              Locate
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ======================================================================
              TAB: SHELTERS
              ====================================================================== */}
          {activeTab === "shelters" && (
            <div className="space-y-6">

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800">DMC Shelter Capacity Audit</h3>
                <p className="text-xs text-slate-400 mt-0.5">Manage temporary relief shelter populations and availability metrics</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shelters.map((shelter) => {
                  const occupancyRate = (shelter.occupancy / shelter.capacity) * 100;
                  return (
                    <div key={shelter.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[10px] text-blue-600 font-bold block uppercase tracking-wider">{shelter.id}</span>
                            <h4 className="font-bold text-slate-800 text-base mt-0.5">{shelter.name}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${occupancyRate >= 90 ? "bg-red-100 text-red-700" :
                            occupancyRate >= 60 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                            }`}>
                            {occupancyRate >= 90 ? "Full" : "Available"}
                          </span>
                        </div>

                        <hr className="my-4 border-slate-100" />

                        {/* Progress Bar occupancy */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-slate-500">
                            <span>Occupancy Rate</span>
                            <span>{shelter.occupancy} / {shelter.capacity} ({Math.round(occupancyRate)}%)</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${occupancyRate}%` }}
                              className={`h-full rounded-full transition-all duration-300 ${occupancyRate >= 90 ? "bg-red-500" :
                                occupancyRate >= 60 ? "bg-amber-500" : "bg-green-500"
                                }`}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                        <button
                          onClick={() => {
                            setSelectedLocation([shelter.lat, shelter.lon]);
                            setSelectedZoom(14);
                            setActiveTab("map");
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-800 flex items-center gap-1.5"
                        >
                          <MapPin size={14} /> Locate on Map
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateShelterOccupancy(shelter.id, -10)}
                            className="w-9 h-9 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center font-bold"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleUpdateShelterOccupancy(shelter.id, 10)}
                            className="w-9 h-9 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ======================================================================
              TAB: RESOURCES
              ====================================================================== */}
          {activeTab === "resources" && (
            <div className="space-y-6">

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800">DMC Operational Resources Directory</h3>
                <p className="text-xs text-slate-400 mt-0.5">Mobilize relief units, medical teams, and inflatable rescue boats</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/40 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-4.5 px-6">Resource ID</th>
                      <th className="py-4.5 px-6">Resource Name</th>
                      <th className="py-4.5 px-6">Classification</th>
                      <th className="py-4.5 px-6">Deployment Status</th>
                      <th className="py-4.5 px-6">Operational Details</th>
                      <th className="py-4.5 px-6 text-right">Duty Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                    {resources.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-50/30 transition">
                        <td className="py-4.5 px-6 font-bold text-slate-500">{res.id}</td>
                        <td className="py-4.5 px-6 font-bold text-slate-800">{res.name}</td>
                        <td className="py-4.5 px-6 text-xs text-slate-500 font-semibold">{res.type}</td>
                        <td className="py-4.5 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${res.status === "Available" ? "bg-green-100 text-green-700" :
                            res.status === "Busy" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                            }`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="py-4.5 px-6 text-slate-500 italic">"{res.details}"</td>
                        <td className="py-4.5 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleUpdateResourceStatus(res.id, "Available")}
                            className="bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded border border-green-200"
                          >
                            Mark Idle
                          </button>
                          <button
                            onClick={() => handleUpdateResourceStatus(res.id, "Busy")}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded border border-amber-200"
                          >
                            Deploy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* CREATE ALERT MODAL */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0f172a] text-white p-6">
              <h3 className="font-extrabold text-lg">Broadcast Warning Alert</h3>
              <p className="text-xs text-slate-400 mt-1">This alert will publish immediately to the public mobile application</p>
            </div>

            <form onSubmit={handleCreateAlert} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">Alert Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Major Flood Warning"
                  value={newAlert.title}
                  onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">River</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kelani Ganga"
                    value={newAlert.river}
                    onChange={(e) => setNewAlert({ ...newAlert, river: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">Station (Trigger)</label>
                  <input
                    type="text"
                    placeholder="e.g. Hanwella"
                    value={newAlert.station}
                    onChange={(e) => setNewAlert({ ...newAlert, station: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">Affected Location(s)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kaduwela, Kolonnawa areas"
                  value={newAlert.location}
                  onChange={(e) => setNewAlert({ ...newAlert, location: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-500">Severity Level</label>
                  <select
                    value={newAlert.severity}
                    onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-500">Detailed Message</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Evacuation alerts or rising level advice for residents..."
                  value={newAlert.message}
                  onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                ></textarea>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-4.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl border border-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 transition"
                >
                  Broadcast Warning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}