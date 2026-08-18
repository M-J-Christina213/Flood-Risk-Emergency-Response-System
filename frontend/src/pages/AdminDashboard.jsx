import {
  Map,
  AlertTriangle,
  Users,
  FileWarning,
  Activity
} from "lucide-react";

function AdminDashboard() {

  return (

    <div className="admin-dashboard">

      <aside className="sidebar">

        <h1>🌊 FloodSafe</h1>

        <p>Emergency Command</p>


        <nav>

          <div className="active">
            <Map size={20} />
            Overview
          </div>

          <div>
            <Activity size={20} />
            Live Risk
          </div>

          <div>
            <AlertTriangle size={20} />
            Alerts
          </div>

          <div>
            <FileWarning size={20} />
            Citizen Reports
          </div>

          <div>
            <Users size={20} />
            Affected Areas
          </div>

        </nav>

      </aside>


      <main className="dashboard-main">

        <header className="dashboard-header">

          <div>

            <h1>Flood Risk Dashboard</h1>

            <p>
              Real-time flood monitoring and emergency coordination
            </p>

          </div>

          <div className="status">
            ● System Online
          </div>

        </header>


        <section className="stats">

          <div className="stat-card">

            <Activity />

            <span>Monitoring Stations</span>

            <strong>--</strong>

          </div>


          <div className="stat-card">

            <AlertTriangle />

            <span>High Risk Areas</span>

            <strong>--</strong>

          </div>


          <div className="stat-card">

            <FileWarning />

            <span>Citizen Reports</span>

            <strong>--</strong>

          </div>


          <div className="stat-card">

            <Users />

            <span>Affected Areas</span>

            <strong>--</strong>

          </div>

        </section>


        <section className="dashboard-map">

          <div className="map-placeholder">

            <Map size={55} />

            <h2>GIS Flood Risk Map</h2>

            <p>
              River stations, predicted risk areas,
              citizen reports and affected locations
              will appear here.
            </p>

          </div>

        </section>

      </main>

    </div>

  );

}

export default AdminDashboard;