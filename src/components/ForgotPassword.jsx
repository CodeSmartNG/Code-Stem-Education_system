// src/components/ForgotPassword.jsx
import React, { useState } from 'react';
import './AuthForms.css';

const ForgotPassword = ({ onBack, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      await onForgotPassword(email);
      setMessage('✅ If an account exists with this email, a reset link has been sent. Check your inbox and spam folder.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">🔑</div>
          <h2>Forgot Password?</h2>
          <p>Enter your email and we'll send you a link to reset your password</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">❌</span>
            <span className="error-text">{error}</span>
            <button className="error-close" onClick={() => setError('')}>×</button>
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
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <>
                <div className="spinner"></div>
                Sending...
              </>
            ) : (
              '📧 Send Reset Link'
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

export default ForgotPassword;
