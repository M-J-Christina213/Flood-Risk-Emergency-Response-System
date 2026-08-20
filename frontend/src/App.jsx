import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import UserApp from "./pages/UserApp";
import AdminDashboard from "./pages/AdminDashboard";
import ReportFlood from "./pages/ReportFlood";
import Alerts from "./pages/Alerts";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Authority dashboard at root */}
        <Route path="/" element={<AdminDashboard />} />

        {/* Public user pages (backups) */}
        <Route path="/report" element={<ReportFlood />} />
        <Route path="/alerts" element={<Alerts />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;