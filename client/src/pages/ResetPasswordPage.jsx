import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/images/logo1.png";
import "./Pages.css";

function ResetPasswordPage() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState("form"); // form, success, error
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword,
          confirmPassword
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResetStatus('success');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setResetStatus('error');
        setErrorMessage(data.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setResetStatus('error');
      setErrorMessage('Server error during password reset');
    }

    setIsLoading(false);
  };

  if (resetStatus === 'success') {
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
              <h1>Password Reset Successful</h1>
              <p>
                Your password has been reset successfully. You can now login to the system 
                using your email and new password.
              </p>

              <div className="login-feature-list">
                <div className="login-feature-card" style={{ backgroundColor: '#d1fae5', borderLeft: '4px solid #10b981' }}>
                  <strong>✓ Password Updated</strong>
                  <span>Your account is now protected with your new password.</span>
                </div>

                <div className="login-feature-card">
                  <strong>Back to Login</strong>
                  <span>
                    Return to the login page and enter your credentials.
                  </span>
                </div>

                <div className="login-feature-card">
                  <strong>System Access</strong>
                  <span>
                    After login, you'll have full access to disaster relief operations.
                  </span>
                </div>
              </div>
            </div>
            <div className="login-footer-note">
              Password Reset Confirmed | Secure Access
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="login-form-panel">
            <div className="login-form-card">
              <h2>Success! ✓</h2>
              <p className="login-subtitle">
                Your password has been reset successfully
              </p>

              <div style={{ 
                backgroundColor: '#d1fae5', 
                border: '1px solid #6ee7b7',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#047857', margin: 0 }}>
                  ✓ Password reset completed successfully
                </p>
              </div>

              <p style={{ color: '#374151', marginBottom: '24px', textAlign: 'center' }}>
                You can now login with your new password.
              </p>

              <button
                onClick={() => navigate('/login')}
                className="btn-base btn-primary"
                style={{ width: '100%' }}
              >
                Back to Login
              </button>

              <div className="login-card-footer">
                Ready to Access the System
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (resetStatus === 'error') {
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
              <h1>Password Reset Error</h1>
              <p>
                There was an issue resetting your password. This could be because 
                the link has expired or is invalid.
              </p>

              <div className="login-feature-list">
                <div className="login-feature-card" style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444' }}>
                  <strong>✗ Reset Failed</strong>
                  <span>{errorMessage}</span>
                </div>

                <div className="login-feature-card">
                  <strong>Try Again</strong>
                  <span>
                    Return to the login page and use the forgot password feature again.
                  </span>
                </div>

                <div className="login-feature-card">
                  <strong>Need Help?</strong>
                  <span>
                    Contact the system administrator if the issue persists.
                  </span>
                </div>
              </div>
            </div>
            <div className="login-footer-note">
              Password Reset Error | Try Again
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="login-form-panel">
            <div className="login-form-card">
              <h2>Error ✗</h2>
              <p className="login-subtitle">
                Password reset failed
              </p>

              <div style={{ 
                backgroundColor: '#fee2e2', 
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                textAlign: 'center'
              }}>
                <p style={{ color: '#991b1b', margin: 0 }}>
                  ✗ {errorMessage || 'Password reset link has expired or is invalid'}
                </p>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="btn-base btn-primary"
                style={{ width: '100%' }}
              >
                Back to Login
              </button>

              <div className="login-card-footer">
                System Error | Please Try Again
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form view
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
            <h1>Set Your New Password</h1>
            <p>
              Enter your new password below. Make sure to use a strong password 
              that you'll remember for future logins.
            </p>

            <div className="login-feature-list">
              <div className="login-feature-card">
                <strong>Strong Password</strong>
                <span>Use at least 6 characters with a mix of uppercase, lowercase, and numbers.</span>
              </div>

              <div className="login-feature-card">
                <strong>Account Security</strong>
                <span>
                  Your new password will secure your account and all relief operations.
                </span>
              </div>

              <div className="login-feature-card">
                <strong>Future Access</strong>
                <span>
                  Use this password to login to the system going forward.
                </span>
              </div>
            </div>
          </div>
          <div className="login-footer-note">
            Password Reset via Email Link | Secure Process
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-form-panel">
          <div className="login-form-card">
            <h2>Reset Password</h2>
            <p className="login-subtitle">
              Create a new password for your account
            </p>

            <form onSubmit={handleResetPassword}>
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

              {errorMessage && (
                <div style={{ 
                  backgroundColor: '#fee2e2', 
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  color: '#991b1b',
                  fontSize: '14px'
                }}>
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="btn-base btn-primary"
              >
                {isLoading ? "Resetting Password..." : "Reset Password"}
              </button>
              <button
                type="button"
                className="btn-base btn-light"
                onClick={() => navigate('/login')}
                disabled={isLoading}
              >
                Back to Login
              </button>
            </form>

            <div className="login-card-footer">
              Secure Password Reset | Backend Protected
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;