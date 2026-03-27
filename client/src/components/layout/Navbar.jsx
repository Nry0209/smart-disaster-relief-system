import { useAuth } from "../../context/AuthContext";
import "./layout.css";

function formatRole(role) {
  if (!role) return "";
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1>Smart Disaster Relief Resource Allocation and Tracking System</h1>
        <p>Internal Operations Portal</p>
      </div>

      <div className="topbar-right">
        <div className="role-badge">{formatRole(user?.role)}</div>

        <div className="user-box">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="user-details">
            <strong>{user?.name || "User"}</strong>
            <span>{user?.email || "No email"}</span>
          </div>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;