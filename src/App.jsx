import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import ContractGenerator from "./pages/ContractGenerator";
import StaffProfiles from "./pages/StaffProfiles";
import AdminSettings from "./pages/AdminSettings";
import Documents from "./pages/Documents";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="contract-generator" element={<ContractGenerator />} />
          <Route path="staff-profiles" element={<StaffProfiles />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="documents" element={<Documents />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
