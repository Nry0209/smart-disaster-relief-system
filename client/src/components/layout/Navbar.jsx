import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./layout.css";

function formatRole(role) {
  if (!role) return "";
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPageTitle(pathname) {
  const titleMap = {
    "/dashboard": "Dashboard",
    "/dmc-dashboard": "DMC Dashboard",
    "/dmc-delivery-verification": "Delivery Verification",
    "/disaster-report/create": "Create Disaster Report",
    "/disaster-events": "Disaster Reports",
    "/inventory": "Inventory",
    "/resource-requests": "Resource Requests",
    "/donations/verify": "Donation Verification",
    "/allocations": "Allocation Plans",
    "/distribution-tracking": "Distribution Tracking",
    "/users": "User Management",
    "/reports-analytics": "Reports",
    "/audit-logs": "Audit Logs",
  };

  return titleMap[pathname] || "Dashboard";
}

function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);
  const roleLabel = formatRole(user?.role) || "Admin";
  const roleTone = user?.role === "admin" ? "is-admin" : "is-staff";

  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      setNotificationsError("");

      const token = localStorage.getItem("token");
      if (!token) {
        setNotifications([]);
        return;
      }

      const response = await fetch("http://localhost:5000/api/notifications?limit=8", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Unable to load notifications");
      }

      setNotifications(Array.isArray(payload?.data?.notifications) ? payload.data.notifications : []);
    } catch (error) {
      setNotificationsError(error.message || "Failed to load notifications");
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Listen for notification updates from allocation page
    const handleNotificationUpdate = () => {
      fetchNotifications();
    };
    
    window.addEventListener('notificationUpdate', handleNotificationUpdate);
    
    return () => {
      window.removeEventListener('notificationUpdate', handleNotificationUpdate);
    };
  }, [fetchNotifications]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="header-icon-btn" type="button" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <Menu size={18} />
        </button>
        <div className="topbar-title-block">
          <p className="topbar-system-name">Smart Relief System</p>
          <h1>{pageTitle}</h1>
        </div>
      </div>

      <div className="topbar-center">
        <div className="topbar-search">
          <Search size={16} />
          <input type="text" placeholder="Search reports, users..." aria-label="Search" />
        </div>
      </div>

      <div className="topbar-right">
        <div className="notification-shell">
          <button
            className="header-icon-btn has-badge"
            type="button"
            onClick={() => {
              setIsProfileOpen(false);
              if (!isNotificationsOpen) {
                fetchNotifications();
              }
              setIsNotificationsOpen((current) => !current);
            }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="header-badge">{Math.min(notifications.length, 99)}</span>
          </button>

          {isNotificationsOpen && (
            <div className="dropdown-panel dropdown-notifications">
              {isLoadingNotifications && (
                <p className="dropdown-empty">Loading notifications...</p>
              )}

              {!isLoadingNotifications && notificationsError && (
                <p className="dropdown-empty">{notificationsError}</p>
              )}

              {!isLoadingNotifications && !notificationsError && notifications.length === 0 && (
                <p className="dropdown-empty">No notifications yet.</p>
              )}

              {!isLoadingNotifications && !notificationsError && notifications.map((item) => (
                <button key={item.id} type="button" className="dropdown-item">
                  <span className="dropdown-item-title">{item.title}</span>
                  <span className="dropdown-item-time">{new Date(item.timestamp).toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`role-badge ${roleTone}`}>{roleLabel || "Admin"}</div>

        <div className="profile-shell">
          <button
            className="profile-trigger"
            type="button"
            onClick={() => {
              setIsNotificationsOpen(false);
              setIsProfileOpen((current) => !current);
            }}
          >
            <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div>
            <div className="user-details">
              <strong>{user?.name || "Admin"}</strong>
              <span>{user?.email || "admin@smartrelief.org"}</span>
            </div>
            <ChevronDown size={14} />
          </button>

          {isProfileOpen && (
            <div className="dropdown-panel dropdown-profile">
              <button type="button" className="dropdown-item">My Profile</button>
              <button type="button" className="dropdown-item">Settings</button>
              <button type="button" className="dropdown-item danger" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;