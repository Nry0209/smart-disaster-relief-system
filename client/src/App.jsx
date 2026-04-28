import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LandingPage from "./pages/LandingPage";
import DistributionTracking from "./pages/DistributionTracking";
import UserManagement from "./pages/UserManagement";
import DashboardLayout from "./components/layout/DashboardLayout";
import DmcDashboardPage from "./pages/DmcDashboardPage";
import DmcDeliveryVerificationPage from "./pages/DmcDeliveryVerificationPage";
import PublicDonationPage from "./pages/PublicDonationPage";

import InventoryPage from "./pages/InventoryPage";
import DonationVerificationPage from "./pages/DonationVerificationPage";
import ResourceRequestPage from "./pages/ResourceRequestPage";
import AllocationPage from "./pages/AllocationPage";
import DisasterEventPage from "./pages/DisasterEventPage";
import CreateDisasterReportPage from "./pages/CreateDisasterReportPage";
import ReportsAnalyticsPage from "./pages/ReportsAnalyticsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import { useAuth } from "./context/AuthContext";
import "./App.css";

function DmcOnlyRoute({ children }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "dmc_officer") {
    return <Navigate to="/disaster-events" replace />;
  }

  return children;
}

function RoleRoute({ children, allowedRoles = [], fallback = "/dashboard" }) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/public-donation" element={<PublicDonationPage />} />
      <Route path="/dashboard" element={
        <DashboardLayout>
          <DashboardPage />
        </DashboardLayout>
      } />
      <Route path="/dmc-dashboard" element={
        <DashboardLayout>
          <DmcDashboardPage />
        </DashboardLayout>
      } />
      <Route path="/dmc-delivery-verification" element={
        <DashboardLayout>
          <DmcOnlyRoute>
            <DmcDeliveryVerificationPage />
          </DmcOnlyRoute>
        </DashboardLayout>
      } />
      <Route path="/inventory" element={
        <DashboardLayout>
          <InventoryPage />
        </DashboardLayout>
      } />
      <Route path="/resource-requests" element={
        <DashboardLayout>
          <ResourceRequestPage />
        </DashboardLayout>
      } />
      <Route path="/donations/verify" element={
        <DashboardLayout>
          <DonationVerificationPage />
        </DashboardLayout>
      } />
      <Route path="/distribution-tracking" element={
        <RoleRoute allowedRoles={["admin", "tracking_officer"]} fallback="/dashboard">
          <DashboardLayout>
            <DistributionTracking />
          </DashboardLayout>
        </RoleRoute>
      } />
      <Route path="/users" element={
        <RoleRoute allowedRoles={["admin", "inventory_officer"]} fallback="/dashboard">
          <DashboardLayout>
            <UserManagement />
          </DashboardLayout>
        </RoleRoute>
      } />
      <Route path="/allocations" element={
        <DashboardLayout>
          <AllocationPage />
        </DashboardLayout>
      } />
      <Route path="/allocation-dashboard" element={<Navigate to="/allocations" replace />} />
      <Route path="/allocation" element={<Navigate to="/allocations" replace />} />
      <Route path="/disaster-events" element={
        <DashboardLayout>
          <DisasterEventPage />
        </DashboardLayout>
      } />
      <Route path="/disaster-report/create" element={
        <DashboardLayout>
          <RoleRoute allowedRoles={["admin", "dmc_officer"]} fallback="/dashboard">
            <CreateDisasterReportPage />
          </RoleRoute>
        </DashboardLayout>
      } />
      <Route path="/reports-analytics" element={
        <DashboardLayout>
          <ReportsAnalyticsPage />
        </DashboardLayout>
      } />
      <Route path="/prediction" element={<Navigate to="/reports-analytics" replace />} />
      <Route path="/audit-logs" element={
        <RoleRoute allowedRoles={["admin"]} fallback="/dashboard">
          <DashboardLayout>
            <AuditLogsPage />
          </DashboardLayout>
        </RoleRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
