// src/components/RegisterForm.jsx

import React, { useState } from 'react';
import './AuthForms.css';

const RegisterForm = ({ onRegister, onSwitchToLogin, isRegistering }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    role: 'student'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [touchedFields, setTouchedFields] = useState({});

  // Calculate password strength with more criteria
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    let criteria = [];

    // Length check
    if (password.length >= 8) {
      strength++;
      criteria.push('length');
    }

    // Uppercase and lowercase
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
      strength++;
      criteria.push('case');
    }

    // Numbers
    if (password.match(/\d/)) {
      strength++;
      criteria.push('number');
    }

    // Special characters
    if (password.match(/[^a-zA-Z\d]/)) {
      strength++;
      criteria.push('special');
    }

    // Additional length bonus
    if (password.length >= 12) {
      strength = Math.min(strength + 1, 5);
      criteria.push('long');
    }

    return { strength, criteria };
  };

  const getStrengthInfo = (strength) => {
    const levels = [
      { label: 'Very Weak', color: '#ef4444', emoji: '🔴', description: 'Too short or too common' },
      { label: 'Weak', color: '#f59e0b', emoji: '🟠', description: 'Add more variety' },
      { label: 'Fair', color: '#f59e0b', emoji: '🟡', description: 'Could be stronger' },
      { label: 'Good', color: '#10b981', emoji: '🟢', description: 'Strong password' },
      { label: 'Excellent', color: '#10b981', emoji: '💪', description: 'Very secure password' }
    ];
    return levels[Math.min(strength, 4)];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter your full name');
      setIsLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    if (!formData.termsAccepted) {
      setError('Please accept the Terms and Conditions');
      setIsLoading(false);
      return;
    }

    try {
      await onRegister(formData.name, formData.email, formData.password);
      setSuccess('✅ Registration successful! Please check your email for verification.');
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        termsAccepted: false,
        role: 'student'
      });
      setPasswordStrength(0);
      setTouchedFields({});
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setFormData({
      ...formData,
      [name]: newValue
    });

    // Update password strength
    if (name === 'password') {
      const { strength } = calculatePasswordStrength(value);
      setPasswordStrength(strength);
    }

    // Clear errors on change
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleBlur = (field) => {
    setTouchedFields({
      ...touchedFields,
      [field]: true
    });
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const isFormValid = () => {
    return (
      formData.name.trim() &&
      formData.email.trim() &&
      formData.password &&
      formData.confirmPassword &&
      formData.password === formData.confirmPassword &&
      formData.password.length >= 8 &&
      formData.termsAccepted
    );
  };

  const getPasswordRequirements = () => {
    const password = formData.password;
    return [
      {
        met: password.length >= 8,
        text: 'At least 8 characters'
      },
      {
        met: /[a-z]/.test(password) && /[A-Z]/.test(password),
        text: 'Uppercase and lowercase letters'
      },
      {
        met: /\d/.test(password),
        text: 'At least one number'
      },
      {
        met: /[^a-zA-Z\d]/.test(password),
        text: 'At least one special character'
      }
    ];
  };

  const strengthInfo = getStrengthInfo(passwordStrength);
  const passwordRequirements = getPasswordRequirements();

  return (
    <div className="auth-form">
      <div className="form-header">
        <div className="form-header-icon">🎓</div>
        <h2>Create Student Account</h2>
        <p className="form-description">
          Join our STEM learning community. We'll send a confirmation email to verify your account.
        </p>
      </div>

      {error && (
        <div className="message-container error">
          <span className="message-icon">❌</span>
          <span className="message-text">{error}</span>
          <button className="message-close" onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="message-container success">
          <span className="message-icon">✅</span>
          <span className="message-text">{success}</span>
          <button className="message-close" onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={() => handleBlur('name')}
            required
            disabled={isLoading || isRegistering}
            placeholder="Enter your full name"
            autoComplete="name"
            className={touchedFields.name && !formData.name.trim() ? 'invalid' : ''}
          />
          {touchedFields.name && !formData.name.trim() && (
            <small className="input-error">Please enter your full name</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={() => handleBlur('email')}
            required
            disabled={isLoading || isRegistering}
            placeholder="Enter your email address"
            autoComplete="email"
            className={touchedFields.email && !formData.email.trim() ? 'invalid' : ''}
          />
          <small className="input-help">
            📧 We'll send a confirmation link to this email
          </small>
          {touchedFields.email && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
            <small className="input-error">Please enter a valid email address</small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password *</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur('password')}
              required
              disabled={isLoading || isRegistering}
              placeholder="Create a password (min. 8 characters)"
              minLength="8"
              autoComplete="new-password"
              className={
                formData.password && passwordStrength >= 3 ? 'valid' :
                formData.password && passwordStrength < 3 ? 'invalid' : ''
              }
            />
            <button
              type="button"
              className="password-toggle"
              onClick={handleTogglePassword}
              disabled={isLoading || isRegistering}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="password-strength-container">
              <div className="password-strength">
                <div
                  className={`password-strength-bar ${passwordStrength >= 1 ? 'active' : ''}`}
                  style={{ backgroundColor: passwordStrength >= 1 ? strengthInfo.color : '' }}
                ></div>
                <div
                  className={`password-strength-bar ${passwordStrength >= 2 ? 'active' : ''}`}
                  style={{ backgroundColor: passwordStrength >= 2 ? strengthInfo.color : '' }}
                ></div>
                <div
                  className={`password-strength-bar ${passwordStrength >= 3 ? 'active' : ''}`}
                  style={{ backgroundColor: passwordStrength >= 3 ? strengthInfo.color : '' }}
                ></div>
                <div
                  className={`password-strength-bar ${passwordStrength >= 4 ? 'active' : ''}`}
                  style={{ backgroundColor: passwordStrength >= 4 ? strengthInfo.color : '' }}
                ></div>
                <div
                  className={`password-strength-bar ${passwordStrength >= 5 ? 'active' : ''}`}
                  style={{ backgroundColor: passwordStrength >= 5 ? strengthInfo.color : '' }}
                ></div>
              </div>
              <div className="password-strength-info">
                <span className="password-strength-label" style={{ color: strengthInfo.color }}>
                  {strengthInfo.emoji} {strengthInfo.label}
                </span>
                <span className="password-strength-description">
                  {strengthInfo.description}
                </span>
              </div>
            </div>
          )}

          {/* Password Requirements List */}
          <div className="password-requirements">
            <small className="input-help">Password requirements:</small>
            <ul>
              {passwordRequirements.map((req, index) => (
                <li key={index} className={req.met ? 'met' : ''}>
                  {req.met ? '✅' : '⬜'} {req.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <div className="password-input-wrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => handleBlur('confirmPassword')}
              required
              disabled={isLoading || isRegistering}
              placeholder="Confirm your password"
              autoComplete="new-password"
              className={
                formData.confirmPassword && formData.password === formData.confirmPassword
                  ? 'valid'
                  : formData.confirmPassword ? 'invalid' : ''
              }
            />
            <button
              type="button"
              className="password-toggle"
              onClick={handleToggleConfirmPassword}
              disabled={isLoading || isRegistering}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {formData.confirmPassword && (
            <div className="password-match-indicator">
              {formData.password === formData.confirmPassword ? (
                <small className="input-success">✅ Passwords match</small>
              ) : (
                <small className="input-error">❌ Passwords do not match</small>
              )}
            </div>
          )}
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleChange}
              disabled={isLoading || isRegistering}
            />
            <span className="checkbox-text">
              I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and
              <a href="/privacy" target="_blank" rel="noopener noreferrer"> Privacy Policy</a> *
            </span>
          </label>
        </div>

        <button
          type="submit"
          className={`btn-primary ${isLoading ? 'loading' : ''}`}
          disabled={!isFormValid() || isLoading || isRegistering}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              Creating Account...
            </>
          ) : (
            '🚀 Create Account'
          )}
        </button>
      </form>

      <div className="auth-links">
        <p>
          Already have an account?{' '}
          <span
            onClick={isLoading || isRegistering ? undefined : onSwitchToLogin}
            className={`link ${(isLoading || isRegistering) ? 'disabled' : ''}`}
          >
            Login here
          </span>
        </p>
        <p className="auth-alt-option">
          Want to teach?{' '}
          <span
            onClick={isLoading || isRegistering ? undefined : () => onSwitchToLogin('teacher-register')}
            className={`link ${(isLoading || isRegistering) ? 'disabled' : ''}`}
          >
            Register as Teacher
          </span>
        </p>
      </div>

      <div className="registration-info">
        <h4>📋 What happens next?</h4>
        <ul>
          <li>📧 You'll receive a confirmation email</li>
          <li>🔗 Click the link in the email to verify your account</li>
          <li>✅ Come back here to log in and start learning</li>
        </ul>
        <div className="info-note">
          <p>⚠️ Check your spam folder if you don't see the email within 5 minutes.</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;
