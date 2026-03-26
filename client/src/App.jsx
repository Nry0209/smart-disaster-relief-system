import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import DistributionTracking from "./pages/DistributionTracking";
import UserManagement from "./pages/UserManagement";
import DashboardLayout from "./components/layout/DashboardLayout";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <DashboardLayout>
          <DashboardPage />
        </DashboardLayout>
      } />
      <Route path="/distribution-tracking" element={
        <DashboardLayout>
          <DistributionTracking />
        </DashboardLayout>
      } />
      <Route path="/users" element={
        <DashboardLayout>
          <UserManagement />
        </DashboardLayout>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;