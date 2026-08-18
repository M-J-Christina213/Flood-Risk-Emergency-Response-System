import { useState } from "react";
import { MapPin, Camera, Send } from "lucide-react";
import { Link } from "react-router-dom";

function ReportFlood() {

  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");

  function submitReport(e) {

    e.preventDefault();

    console.log({
      type,
      severity,
      timestamp: new Date().toISOString()
    });

    alert("Flood report submitted successfully.");

  }

  return (

    <div className="report-page">

      <header>

        <Link to="/">
          ← Back
        </Link>

        <h1>Report Flooding</h1>

        <p>
          Help authorities understand the situation in your area.
        </p>

      </header>


      <form onSubmit={submitReport}>

        <section>

          <h2>
            <MapPin size={20} />
            Location
          </h2>

          <div className="location-box">

            <MapPin size={20} />

            <span>
              Current location will be detected automatically
            </span>

          </div>

        </section>


        <section>

          <h2>What are you seeing?</h2>

          <label>
            <input
              type="radio"
              name="type"
              value="road"
              onChange={(e) => setType(e.target.value)}
            />
            Road flooding
          </label>

          <label>
            <input
              type="radio"
              name="type"
              value="river"
              onChange={(e) => setType(e.target.value)}
            />
            River overflow
          </label>

          <label>
            <input
              type="radio"
              name="type"
              value="building"
              onChange={(e) => setType(e.target.value)}
            />
            Building flooding
          </label>

          <label>
            <input
              type="radio"
              name="type"
              value="blocked"
              onChange={(e) => setType(e.target.value)}
            />
            Road / bridge blocked
          </label>

        </section>


        <section>

          <h2>Severity</h2>

          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
          >

            <option value="">
              Select severity
            </option>

            <option value="low">
              Low
            </option>

            <option value="moderate">
              Moderate
            </option>

            <option value="severe">
              Severe
            </option>

          </select>

        </section>


        <section>

          <h2>
            <Camera size={20} />
            Photo
          </h2>

          <input
            type="file"
            accept="image/*"
            capture="environment"
          />

        </section>


        <button type="submit">

          <Send size={20} />

          Submit Flood Report

        </button>

      </form>

    </div>

  );
}

export default ReportFlood;