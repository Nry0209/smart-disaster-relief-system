import { NavLink } from "react-router-dom";
import { SIDEBAR_ITEMS } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import logo1 from "../../assets/images/logo1.png";
import "./layout.css";

function Sidebar() {
  const { user } = useAuth();

  const allowedItems = SIDEBAR_ITEMS.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <img src={logo1} alt="Smart Relief Logo" style={{ width: '120%', height: '120%', objectFit: 'cover' }} />
        </div>
        <div className="sidebar-text">
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
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Authorized internal access only</p>
      </div>
    </aside>
  );
}

export default Sidebar;