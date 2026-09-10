// src/components/LoginForm.jsx
import React, { useState, useEffect } from 'react';
import './AuthForms.css';

const LoginForm = ({ 
  onLogin, 
  onSwitchToRegister, 
  onSwitchToTeacherRegister, 
  isLoading: parentLoading,
  onResendVerification
}) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Check for saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowResendVerification(false);
    setResendMessage('');

    if (isLocked) {
      setError('Account temporarily locked. Please wait 30 seconds before trying again.');
      return;
    }

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const result = await onLogin(formData.email, formData.password);

      if (result === 'email_not_verified') {
        setError('Please verify your email before logging in.');
        setShowResendVerification(true);
        setIsLoading(false);
        return;
      }

      if (result === true || result === 'success') {
        if (rememberMe) {
          localStorage.setItem('remembered_email', formData.email);
        } else {
          localStorage.removeItem('remembered_email');
        }
        setError('');
        setLoginAttempts(0);
        setShowResendVerification(false);
      } else {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);

        if (newAttempts >= 5) {
          setIsLocked(true);
          setError('Too many failed attempts. Account locked for 30 seconds.');
          setTimeout(() => {
            setIsLocked(false);
            setLoginAttempts(0);
            setError('');
          }, 30000);
        } else {
          setError(`Invalid email or password. ${5 - newAttempts} attempts remaining.`);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      
      const errorMessage = err.message?.toLowerCase() || '';
      
      if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
        setError('⚠️ Cannot connect to server. Please try again later.');
      } else if (errorMessage.includes('verify your email')) {
        setError('Please verify your email before logging in.');
        setShowResendVerification(true);
      } else if (errorMessage.includes('user not found')) {
        setError('No account found with this email. Please register first.');
      } else if (errorMessage.includes('pending approval')) {
        setError('Your teacher account is pending admin approval.');
      } else if (errorMessage.includes('invalid') || errorMessage.includes('credentials')) {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }

      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= 5) {
        setIsLocked(true);
        setTimeout(() => {
          setIsLocked(false);
          setLoginAttempts(0);
        }, 30000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsLoading(true);
      setResendMessage('');

      if (onResendVerification) {
        const result = await onResendVerification(formData.email);
        if (result && result.success) {
          setResendMessage('✅ Verification email resent successfully! Please check your inbox.');
          setShowResendVerification(false);
        } else {
          setResendMessage('❌ Failed to resend verification email. Please try again.');
        }
      } else {
        setResendMessage('❌ Resend verification is not available. Please contact support.');
      }
    } catch (error) {
      setResendMessage('❌ ' + (error.message || 'Failed to resend verification email.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setShowResendVerification(false);
    setResendMessage('');
  };

  const toggleShowPassword = () => {
    setShowPassword(prev => !prev);
  };

  const handleForgotPassword = () => {
    setError('Password reset functionality will be available soon. Please contact support.');
  };

  const clearError = () => {
    setError('');
    setShowResendVerification(false);
    setResendMessage('');
  };

  // ✅ UPDATED: Demo credentials with simpler password
  const fillDemoCredentials = (type) => {
    if (type === 'admin') {
      setFormData({
        email: 'codesmartng1@gmail.com',
        password: 'Admin@1234'
      });
    } else if (type === 'teacher') {
      setFormData({
        email: 'kabiralkasim6@gmail.com',
        password: 'Admin@1234'
      });
    } else if (type === 'student') {
      setFormData({
        email: 'kabiralkasim9@gmail.com',
        password: 'Admin@1234'
      });
    }
    setError('');
    setShowResendVerification(false);
    setResendMessage('');
  };

  const isDisabled = isLoading || parentLoading || isLocked;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">🔐</div>
          <h2>Welcome Back</h2>
          <p>Sign in to your STEM Platform account</p>
          {loginAttempts > 0 && loginAttempts < 5 && (
            <div className="attempts-warning">
              ⚠️ {5 - loginAttempts} login attempts remaining
            </div>
          )}
          {isLocked && (
            <div className="lock-warning">
              🔒 Account temporarily locked
            </div>
          )}
        </div>

        {error && (
          <div className={`error-message ${isLocked ? 'lock-error' : ''}`}>
            <span className="error-icon">{isLocked ? '🔒' : '⚠️'}</span>
            <span className="error-text">{error}</span>
            <button 
              type="button" 
              className="error-close" 
              onClick={clearError}
              aria-label="Close error"
            >
              ×
            </button>
          </div>
        )}

        {showResendVerification && (
          <div className="resend-verification-section">
            <div className="resend-info">
              <span className="resend-icon">📧</span>
              <p>Didn't receive the verification email? Click the button below to resend.</p>
            </div>
            <button
              type="button"
              className="resend-btn"
              onClick={handleResendVerification}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : '📧 Resend Verification Email'}
            </button>
            {resendMessage && (
              <div className={`resend-message ${resendMessage.includes('✅') ? 'success' : 'error'}`}>
                {resendMessage}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email address"
              required
              disabled={isDisabled}
              className={`form-input ${error && !formData.email ? 'input-error' : ''}`}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                disabled={isDisabled}
                className={`form-input ${error && !formData.password ? 'input-error' : ''}`}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={toggleShowPassword}
                disabled={isDisabled}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isDisabled}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="forgot-password"
              onClick={handleForgotPassword}
              disabled={isDisabled}
            >
              Forgot password?
            </button>
          </div>

          <button 
            type="submit" 
            className={`btn-primary login-btn ${isDisabled ? 'loading' : ''}`}
            disabled={isDisabled}
          >
            {isDisabled ? (
              <>
                <div className="spinner"></div>
                {isLocked ? 'Account Locked...' : 'Signing In...'}
              </>
            ) : (
              '🔑 Sign In'
            )}
          </button>
        </form>

        {/* ✅ UPDATED: Demo credentials with simpler password */}
        <div className="demo-credentials">
          <button 
            className="demo-toggle"
            onClick={() => setShowDemoCredentials(!showDemoCredentials)}
            type="button"
          >
            {showDemoCredentials ? '🔽 Hide Demo Accounts' : '▶️ Quick Login with Demo Accounts'}
          </button>

          {showDemoCredentials && (
            <div className="demo-grid">
              <div className="demo-card" onClick={() => fillDemoCredentials('admin')}>
                <div className="demo-role">👑 Admin</div>
                <div className="demo-email">codesmartng1@gmail.com</div>
                <div className="demo-password">Admin@1234</div>
                <div className="demo-hint">Click to fill</div>
              </div>
              <div className="demo-card" onClick={() => fillDemoCredentials('teacher')}>
                <div className="demo-role">👨‍🏫 Teacher</div>
                <div className="demo-email">kabiralkasim6@gmail.com</div>
                <div className="demo-password">Admin@1234</div>
                <div className="demo-hint">Click to fill</div>
              </div>
              <div className="demo-card" onClick={() => fillDemoCredentials('student')}>
                <div className="demo-role">👨‍🎓 Student</div>
                <div className="demo-email">kabiralkasim9@gmail.com</div>
                <div className="demo-password">Admin@1234</div>
                <div className="demo-hint">Click to fill</div>
              </div>
            </div>
          )}
        </div>

        <div className="auth-footer">
          <div className="footer-section">
            <p>Don't have an account?</p>
            <div className="register-options">
              <button 
                type="button" 
                className="btn-outline student-register-btn"
                onClick={onSwitchToRegister}
                disabled={isDisabled}
              >
                <span className="btn-icon">👨‍🎓</span>
                Sign up as Student
              </button>
              <div className="divider">
                <span>or</span>
              </div>
              <button 
                type="button" 
                className="btn-teacher teacher-register-btn"
                onClick={onSwitchToTeacherRegister}
                disabled={isDisabled}
              >
                <span className="btn-icon">👨‍🏫</span>
                Apply as Teacher
              </button>
            </div>
          </div>

          <div className="teacher-info">
            <div className="teacher-info-icon">💡</div>
            <div className="teacher-info-content">
              <h4>Interested in Teaching?</h4>
              <p>Join our platform as an educator and share your knowledge with students</p>
              <ul>
                <li>✅ Create and manage your own courses</li>
                <li>✅ Reach students interested in your expertise</li>
                <li>✅ Get admin approval for quality control</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ✅ UPDATED: Changed from Firebase to Custom Backend */}
        <div className="security-notice">
          <span className="security-icon">🔒</span>
          <p>Your login is secure and encrypted</p>
          <span className="powered-by">🔹 Powered by Custom Backend & Vercel</span>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;