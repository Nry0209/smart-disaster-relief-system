import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import illustration from "../assets/images/loginImage.png";
import logo from "../assets/images/logo2.png";
import "./Pages.css";

// Login Page - Supports 3 user types:
// 1. Admin (System Administrator) - email + password
// 2. Staff (Internal users: DMC Officer, Inventory Officer, etc.) - OTP first login, then email+password
// 3. NGO Partners (NGO Partner) - Same flow as Staff (OTP first login, then email+password)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
const OTP_PATTERN = /^\d{6}$/;

function getPasswordValidationMessage(value) {
  if (!value || value.length < 6) {
    return "Password must be at least 6 characters long.";
  }

  if (!PASSWORD_PATTERN.test(value)) {
    return "Password must include at least one uppercase letter, one lowercase letter, and one number.";
  }

  return "";
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginStep, setLoginStep] = useState("credentials"); // credentials, otp, or normal
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
    forgotPasswordEmail: "",
  });

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

  const getInputClass = (field) =>
    fieldErrors[field]
      ? "border border-rose-300 bg-rose-50/50"
      : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const nextFieldErrors = {
      email: "",
      password: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
      forgotPasswordEmail: "",
    };

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      nextFieldErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextFieldErrors.password = "Password is required.";
    }

    if (nextFieldErrors.email || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      setFormError("Please fix highlighted fields.");
      return;
    }

    setFieldErrors(nextFieldErrors);
    setFormError("");
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
          email: trimmedEmail,
          password,
          role
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFormError("");
        // Normal login successful
        await login({
          email: trimmedEmail,
          password,
          role
        });
      } else {
        // Check if it's a first-login OTP user
        if (data.message && data.message.includes('OTP')) {
          setFormError("");
          setLoginStep('otp');
          alert('This is your first login. Enter the OTP from your email. If email is not configured yet, contact admin for the OTP shown in User Management/server logs.');
        } else {
          setFormError(data.message || 'Login failed');
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setFormError('Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const nextFieldErrors = {
      email: "",
      password: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
      forgotPasswordEmail: "",
    };

    if (!OTP_PATTERN.test(otp)) {
      nextFieldErrors.otp = "Enter the 6-digit OTP sent to your email.";
      setFieldErrors(nextFieldErrors);
      setFormError("Please fix highlighted fields.");
      return;
    }

    setFieldErrors(nextFieldErrors);
    setFormError("");
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
        setFormError("");
        // OTP verified, now need to set password
        setTempAuthToken(data.data.tempToken);
        setRequiresPasswordReset(true);
        setLoginStep('password');
      } else {
        setFormError(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP login error:', error);
      setFormError('OTP verification failed. Please try again.');
    }

    setIsLoading(false);
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    const nextFieldErrors = {
      email: "",
      password: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
      forgotPasswordEmail: "",
    };

    const passwordError = getPasswordValidationMessage(newPassword);
    if (passwordError) {
      nextFieldErrors.newPassword = passwordError;
    }

    if (newPassword !== confirmPassword) {
      nextFieldErrors.confirmPassword = "Passwords do not match.";
    }

    if (nextFieldErrors.newPassword || nextFieldErrors.confirmPassword) {
      setFieldErrors(nextFieldErrors);
      setFormError("Please fix highlighted fields.");
      return;
    }

    setFieldErrors(nextFieldErrors);
    setFormError("");
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
        setFormError("");
        alert('Password set successfully! Please login with your new password.');
        // Reset form and go back to credentials step
        setLoginStep('credentials');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setTempAuthToken(null);
        setRequiresPasswordReset(false);
      } else {
        setFormError(data.message || 'Failed to set password');
      }
    } catch (error) {
      console.error('Set password error:', error);
      setFormError('Failed to set password. Please try again.');
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const nextFieldErrors = {
      email: "",
      password: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
      forgotPasswordEmail: "",
    };

    if (!EMAIL_PATTERN.test(forgotPasswordEmail.trim())) {
      nextFieldErrors.forgotPasswordEmail = "Enter a valid email address.";
      setFieldErrors(nextFieldErrors);
      setFormError("Please fix highlighted fields.");
      return;
    }

    setFieldErrors(nextFieldErrors);
    setFormError("");
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
        setFormError("");
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
        setFormError(data.message || 'Error sending reset link');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setFormError('Error processing forgot password request');
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

              {formError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError}
                </div>
              )}

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
                    onChange={(e) => {
                      setOtp(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, otp: "" }));
                    }}
                    placeholder="Enter 6-digit OTP"
                    required
                    disabled={isLoading}
                    maxLength="6"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    className={getInputClass("otp")}
                  />
                  {fieldErrors.otp && <p className="mt-1 text-xs text-rose-600">{fieldErrors.otp}</p>}
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

              {formError && (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSetPassword}>
                <div className="login-form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, newPassword: "" }));
                    }}
                    placeholder="Enter new password (minimum 6 characters)"
                    required
                    disabled={isLoading}
                    minLength="6"
                    autoComplete="new-password"
                    pattern={PASSWORD_PATTERN.source}
                    title="At least 6 characters including uppercase, lowercase, and a number."
                    className={getInputClass("newPassword")}
                  />
                  {fieldErrors.newPassword && <p className="mt-1 text-xs text-rose-600">{fieldErrors.newPassword}</p>}
                </div>

                <div className="login-form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }}
                    placeholder="Confirm your password"
                    required
                    disabled={isLoading}
                    minLength="6"
                    autoComplete="new-password"
                    className={getInputClass("confirmPassword")}
                  />
                  {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{fieldErrors.confirmPassword}</p>}
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

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="login-form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: "" }));
                  }}
                  placeholder="officer@dmc.gov.lk"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className={getInputClass("email")}
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>}
              </div>

              <div className="login-form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className={getInputClass("password")}
                />
                {fieldErrors.password && <p className="mt-1 text-xs text-rose-600">{fieldErrors.password}</p>}
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
                  <option value="ngo_partner">NGO Partner</option>
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
                  setFormError('');
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
              <>
                {formError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {formError}
                  </div>
                )}
                <p className="text-slate-600 text-sm">
                  Enter your email address and we will send you a password reset link.
                </p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => {
                      setForgotPasswordEmail(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, forgotPasswordEmail: "" }));
                    }}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.forgotPasswordEmail ? "border-rose-300 bg-rose-50/50" : "border-slate-200"
                    }`}
                    autoComplete="email"
                  />
                  {fieldErrors.forgotPasswordEmail && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.forgotPasswordEmail}</p>
                  )}
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