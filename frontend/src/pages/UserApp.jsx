import { MapPin, AlertTriangle, ShieldAlert, FileWarning } from "lucide-react";
import { Link } from "react-router-dom";

function UserApp() {

  return (
    <div className="user-app">

      <header className="app-header">
        <div>
          <h1>🌊 FloodSafe</h1>
          <p>Flood Early Warning & Emergency Support</p>
        </div>

        <div className="location-status">
          <MapPin size={18} />
          <span>Location enabled</span>
        </div>
      </header>


      <main>

        <section className="location-card">

          <MapPin size={28} />

          <div>
            <h2>Your Location</h2>
            <p>Location detection will appear here</p>
          </div>

        </section>


        <section className="map-container">

          <div className="map-placeholder">

            <MapPin size={45} />

            <h2>Flood Risk Map</h2>

            <p>
              GIS map showing flood risk,
              affected areas and nearby reports.
            </p>

          </div>

        </section>


        <section className="risk-card">

          <div className="risk-icon">
            <AlertTriangle size={30} />
          </div>

          <div>

            <h2>Flood Risk Status</h2>

            <p>
              No active high-risk warning detected
            </p>

            <strong>
              Monitoring nearby river stations
            </strong>

          </div>

        </section>


        <section className="actions">

          <Link to="/alerts" className="action-button">
            <ShieldAlert size={22} />
            View Alerts
          </Link>


          <Link to="/report" className="action-button report">
            <FileWarning size={22} />
            Report Flooding
          </Link>

        </section>

      </main>

    </div>
  );
}

export default UserApp;