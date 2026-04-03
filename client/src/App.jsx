import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import DistributionTracking from "./pages/DistributionTracking";
import UserManagement from "./pages/UserManagement";
import DashboardLayout from "./components/layout/DashboardLayout";
import DmcDashboardPage from "./pages/DmcDashboardPage";
import PublicDonationPage from "./pages/PublicDonationPage";

import InventoryPage from "./pages/InventoryPage";
import DonationVerificationPage from "./pages/DonationVerificationPage";
import ResourceRequestPage from "./pages/ResourceRequestPage";
import AllocationPage from "./pages/AllocationPage";
import DisasterEventPage from "./pages/DisasterEventPage";
import CreateDisasterReportPage from "./pages/CreateDisasterReportPage";
import ReportsAnalyticsPage from "./pages/ReportsAnalyticsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import "./App.css";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
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
        <DashboardLayout>
          <DistributionTracking />
        </DashboardLayout>
      } />
      <Route path="/users" element={
        <DashboardLayout>
          <UserManagement />
        </DashboardLayout>
      } />
      <Route path="/allocations" element={
        <DashboardLayout>
          <AllocationPage />
        </DashboardLayout>
      } />
      <Route path="/disaster-events" element={
        <DashboardLayout>
          <DisasterEventPage />
        </DashboardLayout>
      } />
      <Route path="/disaster-report/create" element={
        <DashboardLayout>
          <CreateDisasterReportPage />
        </DashboardLayout>
      } />
      <Route path="/reports-analytics" element={
        <DashboardLayout>
          <ReportsAnalyticsPage />
        </DashboardLayout>
      } />
      <Route path="/audit-logs" element={
        <DashboardLayout>
          <AuditLogsPage />
        </DashboardLayout>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;