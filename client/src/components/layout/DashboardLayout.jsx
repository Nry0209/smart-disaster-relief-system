import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./layout.css";

function DashboardLayout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`dashboard-layout ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar collapsed={isSidebarCollapsed} />

      <div className="dashboard-main">
        <Navbar
          sidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)}
        />
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;