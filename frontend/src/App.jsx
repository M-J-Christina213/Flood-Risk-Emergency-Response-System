import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import UserApp from "./pages/UserApp";
import AdminDashboard from "./pages/AdminDashboard";
import ReportFlood from "./pages/ReportFlood";
import Alerts from "./pages/Alerts";

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Public user application */}
        <Route path="/" element={<UserApp />} />

        {/* Public user pages */}
        <Route path="/report" element={<ReportFlood />} />
        <Route path="/alerts" element={<Alerts />} />

        {/* Authority dashboard */}
        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;