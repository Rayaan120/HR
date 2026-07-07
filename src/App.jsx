import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import ContractGenerator from "./pages/ContractGenerator";
import StaffProfiles from "./pages/StaffProfiles";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="contract-generator" element={<ContractGenerator />} />
          <Route path="staff-profiles" element={<StaffProfiles />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
