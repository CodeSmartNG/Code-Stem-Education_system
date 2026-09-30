// src/components/ResetPassword.jsx
import React, { useState } from 'react';
import './AuthForms.css';

const ResetPassword = ({ token, onResetPassword, onBack }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await onResetPassword(token, password);
      setMessage('✅ Password reset successful! Redirecting to login...');
      setTimeout(() => {
        onBack();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">🔒</div>
          <h2>Reset Password</h2>
          <p>Enter your new password below</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        {message && (
          <div className="message-container success">
            <span className="message-icon">✅</span>
            <span className="message-text">{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                required
                minLength="8"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength="8"
              disabled={isLoading}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Resetting...
              </>
            ) : (
              '🔒 Reset Password'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <div className="footer-section">
            <button
              type="button"
              className="btn-outline"
              onClick={onBack}
              disabled={isLoading}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
