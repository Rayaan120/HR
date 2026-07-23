import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import ContractGenerator from "./pages/ContractGenerator";
import StaffProfiles from "./pages/StaffProfiles";
import AdminSettings from "./pages/AdminSettings";
import Documents from "./pages/Documents";
import StaffStatusReport from "./pages/StaffStatusReport";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/"
            element={(
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            )}
          >
            <Route index element={<Dashboard />} />
            <Route path="contract-generator" element={<ContractGenerator />} />
            <Route path="staff-profiles" element={<StaffProfiles />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="documents" element={<Documents />} />
            <Route path="staff-status-report" element={<StaffStatusReport />} />
            <Route path="interview-schedules" element={<ModulePlaceholder title="Interview Schedules" />} />
            <Route path="staff-roster" element={<ModulePlaceholder title="Staff Roster" />} />
            <Route path="payroll" element={<ModulePlaceholder title="Payroll" />} />
            <Route path="social-insurance" element={<ModulePlaceholder title="Social Insurance" />} />
            <Route path="chats" element={<ModulePlaceholder title="Chats & Announcements" />} />
            <Route path="exit-interviews" element={<ModulePlaceholder title="Exit Interviews" />} />
            <Route path="terminations" element={<ModulePlaceholder title="Terminations" />} />
            <Route path="trainings" element={<ModulePlaceholder title="Trainings" />} />
            <Route path="org-chart" element={<ModulePlaceholder title="Organizational Chart" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
