import { useState } from "react";
import {
  Home,
  Map,
  Bell,
  Menu,
  MapPin,
  CloudRain,
  Waves,
  AlertTriangle,
  Siren,
  Navigation,
  ChevronRight,
} from "lucide-react";

import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("");

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Location is not supported by this browser.");
      return;
    }

    setLocationMessage("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setLocationMessage("Location detected");
      },
      () => {
        setLocationMessage(
          "Unable to get your location. Please allow location access."
        );
      }
    );
  };

  return (
    <div className="app">

      {/* HEADER */}
      <header className="top-bar">
        <div>
          <div className="app-title">Flood Risk</div>
          <div className="app-subtitle">
            Prediction & Emergency Response
          </div>
        </div>

        <button className="icon-button">
          <Bell size={22} />
        </button>
      </header>


      {/* MAIN CONTENT */}
      <main className="content">

        {/* GREETING */}
        <section className="greeting">
          <div>
            <h1>Good Evening</h1>
            <p>Stay informed. Stay safe.</p>
          </div>

          <button
            className="location-button"
            onClick={getLocation}
          >
            <Navigation size={18} />
          </button>
        </section>


        {/* LOCATION */}
        <section className="location-card">

          <div className="location-icon">
            <MapPin size={22} />
          </div>

          <div className="location-info">
            <span>Current Location</span>

            {location ? (
              <strong>
                {location.latitude.toFixed(4)},{" "}
                {location.longitude.toFixed(4)}
              </strong>
            ) : (
              <strong>Location not detected</strong>
            )}

            {locationMessage && (
              <small>{locationMessage}</small>
            )}
          </div>

          <button
            className="detect-button"
            onClick={getLocation}
          >
            Detect
          </button>

        </section>


        {/* FLOOD RISK */}
        <section className="risk-card">

          <div className="risk-header">
            <div>
              <span className="section-label">
                Current Flood Risk
              </span>

              <h2>Moderate</h2>

              <p>
                Based on available river and rainfall information
              </p>
            </div>

            <div className="risk-icon">
              <Waves size={32} />
            </div>
          </div>

          <div className="risk-bar">
            <div className="risk-progress"></div>
          </div>

          <div className="risk-scale">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
            <span>Very High</span>
          </div>

        </section>


        {/* INFORMATION CARDS */}
        <section className="info-grid">

          <div className="info-card">

            <div className="info-icon rainfall">
              <CloudRain size={24} />
            </div>

            <div>
              <span>Rainfall</span>
              <strong>18.6 mm</strong>
              <small>Last 24 hours</small>
            </div>

          </div>


          <div className="info-card">

            <div className="info-icon river">
              <Waves size={24} />
            </div>

            <div>
              <span>River Status</span>
              <strong>Rising</strong>
              <small>Kelani Ganga</small>
            </div>

          </div>

        </section>


        {/* MAP PREVIEW */}
        <section className="map-card">

          <div className="card-heading">

            <div>
              <h3>Flood Risk Map</h3>
              <p>Nearby flood risk areas</p>
            </div>

            <button
              onClick={() => setActiveTab("map")}
              className="view-button"
            >
              View Map
              <ChevronRight size={17} />
            </button>

          </div>

          <div className="map-preview">

            <div className="map-grid"></div>

            <div className="map-zone zone-green"></div>
            <div className="map-zone zone-yellow"></div>
            <div className="map-zone zone-red"></div>

            {location && (
              <div className="user-location">
                <MapPin size={28} />
                <span>You</span>
              </div>
            )}

            {!location && (
              <div className="map-message">
                <MapPin size={30} />
                <span>Detect your location</span>
              </div>
            )}

          </div>

          <div className="map-legend">

            <span>
              <i className="legend low"></i>
              Low
            </span>

            <span>
              <i className="legend moderate"></i>
              Moderate
            </span>

            <span>
              <i className="legend high"></i>
              High
            </span>

            <span>
              <i className="legend very-high"></i>
              Very High
            </span>

          </div>

        </section>


        {/* PREDICTION */}
        <section className="prediction-card">

          <div className="prediction-icon">
            <Waves size={26} />
          </div>

          <div className="prediction-content">

            <span>AI Flood Prediction</span>

            <h3>Prediction available</h3>

            <p>
              The system can estimate the next water-level
              observation using current river and rainfall data.
            </p>

          </div>

          <ChevronRight size={22} />

        </section>


        {/* REPORT FLOOD */}
        <button
          className="report-button"
          onClick={() => setActiveTab("report")}
        >
          <AlertTriangle size={24} />

          <div>
            <strong>Report Flood</strong>
            <span>
              Report flooding near your location
            </span>
          </div>

          <ChevronRight size={22} />

        </button>


        {/* EMERGENCY */}
        <section className="emergency-card">

          <div className="emergency-icon">
            <Siren size={25} />
          </div>

          <div>
            <strong>Emergency?</strong>
            <p>Request emergency assistance</p>
          </div>

          <button>
            SOS
          </button>

        </section>

      </main>


      {/* BOTTOM NAVIGATION */}
      <nav className="bottom-nav">

        <button
          className={activeTab === "home" ? "active" : ""}
          onClick={() => setActiveTab("home")}
        >
          <Home size={22} />
          <span>Home</span>
        </button>


        <button
          className={activeTab === "map" ? "active" : ""}
          onClick={() => setActiveTab("map")}
        >
          <Map size={22} />
          <span>Map</span>
        </button>


        <button
          className="sos-button"
        >
          SOS
        </button>


        <button
          className={activeTab === "alerts" ? "active" : ""}
          onClick={() => setActiveTab("alerts")}
        >
          <Bell size={22} />
          <span>Alerts</span>
        </button>


        <button
          className={activeTab === "menu" ? "active" : ""}
          onClick={() => setActiveTab("menu")}
        >
          <Menu size={22} />
          <span>More</span>
        </button>

      </nav>

    </div>
  );
}

export default App;