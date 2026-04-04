import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import illustration from "../assets/images/loginImage.png";
import logo from "../assets/images/logo1.png";
import "./Pages.css";

const ROLE_REDIRECT_PATHS = {
  admin: "/dashboard",
  dmc_officer: "/dmc-dashboard",
  inventory_officer: "/inventory",
  allocation_officer: "/allocations",
  tracking_officer: "/distribution-tracking",
  charity_staff: "/distribution-tracking",
};

const ROLE_DISPLAY_NAMES = {
  admin: "Admin User",
  dmc_officer: "DMC Officer",
  inventory_officer: "Inventory Officer",
  allocation_officer: "Allocation Officer",
  tracking_officer: "Tracking Officer",
  charity_staff: "Charity Staff",
};

function LoginPage() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState("admin");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const mockUser = {
        id: 1,
        name: ROLE_DISPLAY_NAMES[role] || "Admin User",
        email,
        role,
      };

      login(mockUser);
      navigate(ROLE_REDIRECT_PATHS[role] || "/dashboard");
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="login-page page-base">
      <div className="login-container container-grid">
        {/* LEFT PANEL */}
        <div className="login-visual-panel">
          <div className="login-brand brand-base">
            <img src={logo} alt="System Logo" className="login-brand-logo brand-logo-base" />
            <div>
              <h2>Smart Disaster Relief</h2>
              <p>Resource Allocation System</p>
            </div>
          </div>

          <div className="login-visual-content">
            <h1>Secure internal access for disaster response coordination</h1>
            <p>
              Manage disaster reports, inventory, allocation plans, donation
              verification, and delivery tracking through one centralized
              platform.
            </p>

            <div className="login-feature-list">
              <div className="login-feature-card">
                <strong>Disaster reporting</strong>
                <span>Register incidents, severity, and affected population.</span>
              </div>

              <div className="login-feature-card">
                <strong>Inventory & allocation</strong>
                <span>
                  Track available stock and allocate resources without
                  over-distribution.
                </span>
              </div>

              <div className="login-feature-card">
                <strong>Audit & accountability</strong>
                <span>
                  Log approvals, rejections, allocations, and delivery updates.
                </span>
              </div>
            </div>
          </div>
          <div className="login-footer-note">
            For authorized internal users only
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-form-panel">
          <div className="login-form-card">
            <h2>Login</h2>
            <p className="login-subtitle">
              Sign in to access the Smart Disaster Relief System
            </p>

            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@dmc.gov.lk"
                  required
                />
              </div>

              <div className="login-form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="login-form-group">
                <label>Login role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="dmc_officer">DMC Officer</option>
                  <option value="inventory_officer">Inventory Officer</option>
                  <option value="allocation_officer">Allocation Officer</option>
                  <option value="tracking_officer">Tracking Officer</option>
                  <option value="charity_staff">Charity Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="login-row">
                <label className="remember-box">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => alert("Forgot password flow can be added later")}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-base btn-primary"
              >
                {isLoading ? "Logging in..." : "Login"}
              </button>
              <button
                type="button"
                className="btn-base btn-light"
                onClick={() => navigate("/")}
              >
                Home
              </button>
            </form>

            <div className="login-card-footer">
              Authorized Internal Access Only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;