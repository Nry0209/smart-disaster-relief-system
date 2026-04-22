import { NavLink } from "react-router-dom";
import { SIDEBAR_ITEMS } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import logo2 from "../../assets/images/logo2.png";
import "./layout.css";

function Sidebar({ collapsed = false }) {
  const { user } = useAuth();

  const allowedItems = SIDEBAR_ITEMS.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src={logo2} alt="Smart Relief Logo" />
        </div>
        <div className={`sidebar-text ${collapsed ? "is-collapsed" : ""}`}>
          <h2>Smart Relief</h2>
          <p>Disaster Management System</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {allowedItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={`sidebar-footer ${collapsed ? "is-collapsed" : ""}`}>
        <p>Authorized internal access only</p>
      </div>
    </aside>
  );
}

export default Sidebar;