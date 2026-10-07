// src/components/payments/PaystackPayment.jsx
import React, { useState, useEffect } from 'react';
import { apiCall, getCurrentUser } from '../../utils/storageAPI';

const PaystackPayment = ({ lesson, student, onSuccess, onClose }) => {
  const [currentUser, setCurrentUser] = useState(student || null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!student?.email) {
      getCurrentUser().then((u) => {
        if (u) setCurrentUser(u);
      });
    }
  }, [student]);

  const email = student?.email || currentUser?.email || 'student@example.com';
  const name = student?.name || currentUser?.name || 'Student';
  const uid = student?.id || currentUser?.id || 'unknown';

  const handlePay = async () => {
    setProcessing(true);
    try {
      // ✅ Call BACKEND — never call Paystack directly from frontend
      const response = await apiCall('/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: lesson.id || lesson._id,
          email: email,
          name: name,
          userId: uid,
        }),
      });

      if (response?.success && response.data?.authorization_url) {
        // ✅ Redirect to Paystack's hosted page (no iframe)
        window.location.href = response.data.authorization_url;
      } else {
        alert('Could not start payment: ' + (response?.message || 'Unknown error'));
        setProcessing(false);
      }
    } catch (err) {
      console.error('Pay error:', err);
      alert('Could not open payment: ' + err.message);
      setProcessing(false);
    }
  };

  return (
    <div className="paystack-payment">
      <button
        onClick={handlePay}
        className="payment-btn paystack-btn"
        disabled={processing}
      >
        {processing ? 'Opening Paystack...' : `Pay ₦${lesson.price} with Paystack`}
      </button>
      <p className="payment-note">
        You will be redirected to Paystack's secure payment page
      </p>
    </div>
  );
};

export default PaystackPayment;
