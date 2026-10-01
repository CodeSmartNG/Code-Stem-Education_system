// src/components/EmailConfirmation.jsx

import React, { useState } from 'react';
import './EmailConfirmation.css';

const EmailConfirmation = ({ email, onResend, onCancel }) => {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage('');

    try {
      await onResend();
      setResendMessage('✅ Confirmation email sent successfully! Please check your inbox.');
    } catch (error) {
      setResendMessage('❌ ' + (error.message || 'Failed to resend email. Please try again.'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="email-confirmation-container">
      <div className="email-confirmation-card">
        <div className="confirmation-header">
          <div className="confirmation-icon">📧</div>
          <h2>Confirm Your Email Address</h2>
        </div>

        <div className="confirmation-content">
          <p className="confirmation-instructions">
            We've sent a confirmation email to:
          </p>
          <p className="confirmation-email">{email}</p>

          <div className="confirmation-steps">
            <h3>To complete your registration:</h3>
            <ol>
              <li>Check your email inbox (and spam folder)</li>
              <li>Click the confirmation link in the email</li>
              <li>Return here to log in</li>
            </ol>
          </div>

          <div className="resend-section">
            <p>Didn't receive the email?</p>
            <button
              onClick={handleResend}
              disabled={isResending}
              className="resend-btn"
            >
              {isResending ? 'Sending...' : '📧 Resend Confirmation Email'}
            </button>
            {resendMessage && (
              <p
                className={`resend-message ${
                  resendMessage.includes('✅')
                    ? 'success'
                    : resendMessage.includes('❌')
                    ? 'error'
                    : 'info'
                }`}
              >
                {resendMessage}
              </p>
            )}
          </div>

          <div className="help-tips">
            <h4>💡 Having trouble?</h4>
            <ul>
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes — emails can take time to arrive</li>
              <li>Try resending the verification email if you don't see it</li>
              <li>Contact support if you continue having issues</li>
            </ul>
          </div>
        </div>

        <div className="confirmation-actions">
          <button onClick={onCancel} className="cancel-btn">
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;
