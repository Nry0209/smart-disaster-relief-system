import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import illustration from "../assets/images/loginImage.png";
import logo from "../assets/images/logo1.png";
import "./Pages.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginStep, setLoginStep] = useState("credentials"); // credentials, otp, or normal

  // OTP States
  const [otp, setOtp] = useState("");
  const [tempAuthToken, setTempAuthToken] = useState(null);
  const [requiresPasswordReset, setRequiresPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Choose endpoint based on role
      const endpoint = role === 'admin' ? 'admin/login' : 'staff/login';
      
      // First, try normal password login
      const response = await fetch(`http://localhost:5000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          role
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Normal login successful
        await login({
          email,
          password,
          role
        });
      } else {
        // Check if it's a first-login OTP user
        if (data.message && data.message.includes('OTP')) {
          setLoginStep('otp');
          alert('This is your first login. Enter the OTP from your email. If email is not configured yet, contact admin for the OTP shown in User Management/server logs.');
        } else {
          alert(data.message || 'Login failed');
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/staff/otp-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          otp
        }),
      });

      const data = await response.json();

      if (data.success) {
        // OTP verified, now need to set password
        setTempAuthToken(data.data.tempToken);
        setRequiresPasswordReset(true);
        setLoginStep('password');
      } else {
        alert(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP login error:', error);
      alert('OTP verification failed. Please try again.');
    }

    setIsLoading(false);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/staff/set-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tempAuthToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Password set successfully! Please login with your new password.');
        // Reset form and go back to credentials step
        setLoginStep('credentials');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setTempAuthToken(null);
        setRequiresPasswordReset(false);
      } else {
        alert(data.message || 'Failed to set password');
      }
    } catch (error) {
      console.error('Set password error:', error);
      alert('Failed to set password. Please try again.');
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: forgotPasswordEmail
        }),
      });

      const data = await response.json();

      if (data.success) {
        let msg = data.emailSent 
          ? 'Password reset link has been sent to your email. Please check your email and click the link to reset your password.'
          : 'Password reset prepared. ⚠️ Email not sent (check server logs for reset link).';
        
        if (data.resetToken) {
          const frontendBaseUrl = window.location.origin || 'http://localhost:5173';
          msg += `\n\n🔑 DEV MODE: Direct reset link:\n${frontendBaseUrl}/reset-password/${data.resetToken}`;
        }
        
        alert(msg);
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      } else {
        alert(data.message || 'Error sending reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      alert('Error processing forgot password request');
    }

    setIsLoading(false);
  };

  // Render different forms based on login step
  if (loginStep === 'otp') {
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
              <h1>First-Time Login Verification</h1>
              <p>
                Enter the One-Time Password (OTP) that was sent to your email address.
                This is required for your first login to complete your account setup.
              </p>

              <div className="login-feature-list">
                <div className="login-feature-card">
                  <strong>Secure Access</strong>
                  <span>OTP ensures secure first-time account access.</span>
                </div>

                <div className="login-feature-card">
                  <strong>Set New Password</strong>
                  <span>
                    After OTP verification, you'll set a new password for future logins.
                  </span>
                </div>

                <div className="login-feature-card">
                  <strong>Full System Access</strong>
                  <span>
                    Complete setup grants you full access to disaster relief operations.
                  </span>
                </div>
              </div>
            </div>
            <div className="login-footer-note">
              For authorized internal users only | First Login Setup
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="login-form-panel">
            <div className="login-form-card">
              <h2>Enter OTP</h2>
              <p className="login-subtitle">
                Verify your email address with the OTP you received
              </p>

              <form onSubmit={handleOtpSubmit}>
                <div className="login-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled={true}
                    className="opacity-60"
                  />
                </div>

                <div className="login-form-group">
                  <label>One-Time Password (OTP)</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    required
                    disabled={isLoading}
                    maxLength="6"
                  />
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Enter the 6-digit code. OTP expires in 15 minutes. If SMTP is not configured, use the OTP provided by admin/server logs.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="btn-base btn-primary"
                >
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
                <button
                  type="button"
                  className="btn-base btn-light"
                  onClick={() => setLoginStep('credentials')}
                  disabled={isLoading}
                >
                  Back to Login
                </button>
              </form>

              <div className="login-card-footer">
                OTP-Based First Login Verification
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loginStep === 'password') {
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
              <h1>Complete Your Account Setup</h1>
              <p>
                Set a new password to secure your account and complete the first-time login process.
              </p>

              <div className="login-feature-list">
                <div className="login-feature-card">
                  <strong>Secure Password</strong>
                  <span>Create a strong password with at least 6 characters.</span>
                </div>

                <div className="login-feature-card">
                  <strong>Account Protection</strong>
                  <span>
                    Your new password secures your account and all disaster relief operations.
                  </span>
                </div>

                <div className="login-feature-card">
                  <strong>Future Access</strong>
                  <span>
                    Use this password for all future logins to the system.
                  </span>
                </div>
              </div>
            </div>
            <div className="login-footer-note">
              Complete OTP verification confirmed | Password Setup Required
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="login-form-panel">
            <div className="login-form-card">
              <h2>Set Your Password</h2>
              <p className="login-subtitle">
                Create a new password to secure your account
              </p>

              <form onSubmit={handleSetPassword}>
                <div className="login-form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (minimum 6 characters)"
                    required
                    disabled={isLoading}
                    minLength="6"
                  />
                </div>

                <div className="login-form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    disabled={isLoading}
                    minLength="6"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword}
                  className="btn-base btn-primary"
                >
                  {isLoading ? "Setting Password..." : "Complete Setup"}
                </button>
              </form>

              <div className="login-card-footer">
                Secure Password Setup | Backend Protected
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular login form with forgot password modal
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
            For authorized internal users only | Backend Connected
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>

              <div className="login-form-group">
                <label>Login role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isLoading}>
                  <option value="admin">System Administrator</option>
                  <option value="dmc_officer">DMC Officer</option>
                  <option value="inventory_officer">Inventory Officer</option>
                  <option value="allocation_officer">Allocation Officer</option>
                  <option value="tracking_officer">Tracking Officer</option>
                  <option value="charity_staff">Charity Staff</option>
                </select>
              </div>

              <div className="login-row">
                <label className="remember-box">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    disabled={isLoading}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => setShowForgotPassword(true)}
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-base btn-primary"
              >
                {isLoading ? "Authenticating..." : "Login"}
              </button>
              <button
                type="button"
                className="btn-base btn-light"
                onClick={() => navigate("/")}
                disabled={isLoading}
              >
                Home
              </button>
            </form>

            <div className="login-card-footer">
              Authorized Internal Access Only | Real Backend Authentication
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
              <button 
                className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
              <>
                <p className="text-slate-600 text-sm">
                  Enter your email address and we will send you a password reset link.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-base btn-primary w-full"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;