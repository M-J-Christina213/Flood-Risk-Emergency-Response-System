import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck } from "lucide-react";

function Alerts() {

  return (

    <div className="alerts-page">

      <Link to="/">
        ← Back
      </Link>

      <h1>Flood Alerts</h1>

      <div className="alert-card warning">

        <AlertTriangle size={30} />

        <div>

          <h2>No Active Emergency Alert</h2>

          <p>
            Your area is currently being monitored.
          </p>

        </div>

      </div>


      <div className="info-card">

        <ShieldCheck size={25} />

        <div>

          <h3>Stay Prepared</h3>

          <p>
            Keep emergency contacts and evacuation
            information accessible.
          </p>

        </div>

      </div>

    </div>

  );
}

export default Alerts;