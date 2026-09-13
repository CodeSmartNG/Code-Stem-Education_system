// src/components/EmailConfirmation.jsx

import React, { useState, useEffect } from 'react';
import './EmailConfirmation.css';

const EmailConfirmation = ({ 
  email, 
  onConfirm, 
  onResend, 
  onCancel,
  token,
  isFirebaseMode = false // ← Changed default to false (not using Firebase)
}) => {
  const [manualToken, setManualToken] = useState(token || '');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);

  // Auto-check verification status periodically
  useEffect(() => {
    if (isFirebaseMode) {
      const interval = setInterval(async () => {
        try {
          setVerificationStatus('checking');
        } catch (error) {
          console.error('Error checking verification status:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isFirebaseMode]);

  const handleManualConfirm = () => {
    if (manualToken.trim()) {
      onConfirm(manualToken.trim());
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage('');

    try {
      await onResend();
      setResendMessage('✅ Confirmation email sent successfully! Please check your inbox.');
      setVerificationStatus(null);
    } catch (error) {
      setResendMessage('❌ ' + (error.message || 'Failed to resend email. Please try again.'));
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    try {
      setIsVerifying(true);
      setVerificationStatus('checking');

      if (onConfirm && typeof onConfirm === 'function') {
        const result = await onConfirm();
        if (result && result.success) {
          setVerificationStatus('verified');
          setResendMessage('✅ Email verified successfully! You can now log in.');
        } else if (result && result.message) {
          setResendMessage('⏳ ' + result.message);
        }
      }
    } catch (error) {
      setVerificationStatus('error');
      setResendMessage('❌ ' + (error.message || 'Failed to verify email. Please try again.'));
    } finally {
      setIsVerifying(false);
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

          {isFirebaseMode && (
            <div className="firebase-status">
              <div className="status-indicator">
                <span className={`status-dot ${verificationStatus === 'verified' ? 'verified' : verificationStatus === 'checking' ? 'checking' : 'pending'}`}></span>
                <span className="status-text">
                  {verificationStatus === 'verified' && '✅ Email Verified'}
                  {verificationStatus === 'checking' && '⏳ Checking verification...'}
                  {verificationStatus === 'error' && '❌ Verification Failed'}
                  {!verificationStatus && '⏳ Waiting for verification...'}
                </span>
              </div>
              {verificationStatus !== 'verified' && (
                <button
                  onClick={handleCheckVerification}
                  disabled={isVerifying}
                  className="check-verification-btn"
                >
                  {isVerifying ? 'Checking...' : '🔍 Check Verification'}
                </button>
              )}
            </div>
          )}

          {isFirebaseMode ? (
            <div className="confirmation-steps firebase-steps">
              <h3>📌 To complete your registration:</h3>
              <ol>
                <li>Check your email inbox (and spam/junk folder)</li>
                <li>Click the <strong>"Verify Email"</strong> button in the email</li>
                <li>Click the <strong>"Check Verification"</strong> button below or refresh the page</li>
                <li>You'll be automatically redirected to login</li>
              </ol>
              <div className="firebase-note">
                <span className="note-icon">🔐</span>
                <p>Email verification is handled securely. The verification link expires after 24 hours.</p>
              </div>
            </div>
          ) : (
            <div className="confirmation-steps">
              <h3>To complete your registration:</h3>
              <ol>
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the confirmation link in the email</li>
                <li>Return here to log in</li>
              </ol>
            </div>
          )}

          {!isFirebaseMode && (
            <div className="manual-confirmation">
              <h4>Demo / Manual Confirmation</h4>
              <p className="demo-note">
                For testing purposes, you can manually enter a confirmation token below:
              </p>
              <div className="token-input-group">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Enter confirmation token"
                  className="token-input"
                />
                <button
                  onClick={handleManualConfirm}
                  disabled={!manualToken.trim()}
                  className="confirm-token-btn"
                >
                  Confirm Email
                </button>
              </div>
            </div>
          )}

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
              <p className={`resend-message ${resendMessage.includes('✅') ? 'success' : resendMessage.includes('❌') ? 'error' : 'info'}`}>
                {resendMessage}
              </p>
            )}
          </div>

          <div className="help-tips">
            <h4>💡 Having trouble?</h4>
            <ul>
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>Wait a few minutes - emails can take time to arrive</li>
              <li>Try resending the verification email if you don't see it</li>
              <li>Contact support if you continue having issues</li>
            </ul>
          </div>
        </div>

        <div className="confirmation-actions">
          <button
            onClick={onCancel}
            className="cancel-btn"
          >
            ← Back to Login
          </button>
        </div>

        <div className="demo-info">
          <details>
            <summary>📋 How Email Verification Works</summary>
            <div className="demo-content">
              <ul>
                <li>Confirmation tokens are stored securely</li>
                <li>You'll receive an email with a verification link</li>
                <li>Click the link to verify your account</li>
                <li>Once verified, you can log in</li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmation;