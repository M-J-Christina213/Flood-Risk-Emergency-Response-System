import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import ReportFlood from "./pages/ReportFlood";
import Alerts from "./pages/Alerts";
import SignIn from './pages/SignIn';
import Operations from './pages/Operations';
import Account from './pages/Account';
import AccessGate from './components/AccessGate';

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Authority dashboard at root */}
        <Route path="/" element={<AccessGate staff><AdminDashboard /></AccessGate>} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/operations" element={<AccessGate staff><Operations /></AccessGate>} />
        <Route path="/account" element={<AccessGate><Account /></AccessGate>} />

        {/* Public user pages (backups) */}
        <Route path="/report" element={<ReportFlood />} />
        <Route path="/alerts" element={<Alerts />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;
