// src/components/payments/PaymentModal.jsx
import React, { useState } from 'react';
import PaystackPayment from './PaystackPayment';
import { purchaseLesson, getCurrentUser } from '../../utils/storageAPI';
import './PaymentModal.css';

const PaymentModal = ({ lesson, course, onClose, onSuccess }) => {
  const [step, setStep] = useState('select'); // select | processing | success | error
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const currentUser = getCurrentUser();
  const safeLesson = lesson || {};
  const safeCourse = course || {};

  // ============================================
  // Called when Paystack verifies payment successfully
  // ============================================
  const handlePaystackSuccess = async (paymentData) => {
    try {
      setIsLoading(true);
      console.log('✅ Paystack returned success:', paymentData);

      // Backend already verified via /payments/verify inside PaystackPayment.jsx
      // Now mark the lesson as purchased for the student
      await purchaseLesson(
        currentUser?.id,
        safeCourse.key,
        safeLesson.id
      );

      setStep('success');

      // Notify parent after showing success
      setTimeout(() => {
        if (typeof onSuccess === 'function') {
          onSuccess(paymentData);
        }
      }, 1500);
    } catch (err) {
      console.error('❌ Payment completion error:', err);
      setError('Payment succeeded, but unlock failed. Please refresh.');
      setStep('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaystackClose = () => {
    console.log('User closed Paystack modal');
    setStep('select');
    setIsLoading(false);
  };

  // ============================================
  // RENDER
  // ============================================
  if (!lesson) return null;

  const renderStep = () => {
    switch (step) {
      case 'select':
        return (
          <div className="payment-methods">
            <h3>Select Payment Method</h3>

            <div className="methods-grid">
              <div className="method-card selected">
                <div className="method-icon">💳</div>
                <div className="method-info">
                  <h4>Paystack</h4>
                  <p>Pay with card, bank, or USSD</p>
                  <div className="method-supports">
                    <span className="support-tag">Card</span>
                    <span className="support-tag">Bank Transfer</span>
                    <span className="support-tag">USSD</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="payment-summary">
              <h4>Order Summary</h4>
              <div className="summary-item">
                <span>Lesson:</span>
                <span>{safeLesson.title || 'Untitled Lesson'}</span>
              </div>
              <div className="summary-item">
                <span>Course:</span>
                <span>{safeCourse.title || 'Untitled Course'}</span>
              </div>
              <div className="summary-item total">
                <span>Total:</span>
                <span>₦{(safeLesson.price || 0).toLocaleString()}</span>
              </div>
            </div>

            {error && (
              <div className="error-message" style={{ color: '#e53e3e', marginTop: 12 }}>
                {error}
              </div>
            )}

            {/* ✅ REAL Paystack checkout — opens Paystack's actual modal */}
            <PaystackPayment
              lesson={safeLesson}
              student={currentUser}
              onSuccess={handlePaystackSuccess}
              onClose={handlePaystackClose}
            />
          </div>
        );

      case 'processing':
        return (
          <div className="payment-processing">
            <div className="processing-spinner"></div>
            <h3>Verifying Payment...</h3>
            <p>Please wait while we confirm your payment with Paystack</p>
          </div>
        );

      case 'success':
        return (
          <div className="payment-success">
            <div className="success-icon">✅</div>
            <h3>Payment Successful!</h3>
            <p>You now have access to "{safeLesson.title || 'the lesson'}"</p>
            <button className="close-btn" onClick={onClose}>
              Start Learning
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="payment-error">
            <div className="error-icon">❌</div>
            <h3>Payment Failed</h3>
            <p>{error || 'Something went wrong with your payment'}</p>
            <div className="action-buttons">
              <button
                className="retry-btn"
                onClick={() => {
                  setError('');
                  setStep('select');
                }}
              >
                Try Again
              </button>
              <button className="close-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="modal-header">
          <h2>Purchase Lesson</h2>
          {step === 'select' && (
            <button className="close-button" onClick={onClose}>×</button>
          )}
        </div>

        <div className="modal-body">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
