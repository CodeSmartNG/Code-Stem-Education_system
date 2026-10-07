// src/components/payments/PaystackPayment.jsx
import React, { useState, useEffect } from 'react';
import { apiCall, getCurrentUser } from '../../utils/storageAPI';

const PaystackPayment = ({ lesson, student, onSuccess, onClose }) => {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
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
    if (!publicKey) {
      alert('Payment is not configured.');
      return;
    }

    setProcessing(true);
    const ref = `lesson_${lesson.id}_${uid}_${Date.now()}`;

    try {
      // ✅ Use Paystack's REST API to initialize a transaction
      const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          amount: Math.round(lesson.price * 100),
          currency: 'NGN',
          reference: ref,
          callback_url: window.location.origin + window.location.pathname,
          metadata: {
            custom_fields: [
              { display_name: 'Student', variable_name: 'student_name', value: name },
              { display_name: 'Lesson', variable_name: 'lesson_title', value: lesson.title },
              { display_name: 'Lesson ID', variable_name: 'lesson_id', value: lesson.id },
            ],
          },
        }),
      }).then((r) => r.json());

      // ❌ This won't work — Paystack requires the SECRET key for initialize
      // So we need to call our BACKEND to get the authorization_url
      
      // Instead, let's call our backend endpoint
      const backendInit = await apiCall('/payments/initialize', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: lesson.id,
          email: email,
          name: name,
          userId: uid,
        }),
      });

      if (backendInit?.success && backendInit.data?.authorization_url) {
        // ✅ Redirect to Paystack's hosted checkout page
        window.location.href = backendInit.data.authorization_url;
      } else {
        alert('Could not start payment: ' + (backendInit?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Pay error:', err);
      alert('Could not open payment: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (!publicKey) {
    return <p style={{ color: 'red' }}>Payment is not configured.</p>;
  }

  return (
    <div className="paystack-payment">
      <button
        onClick={handlePay}
        className="payment-btn paystack-btn"
        disabled={processing}
      >
        {processing ? 'Opening payment...' : `Pay ₦${lesson.price} with Paystack`}
      </button>
      <p className="payment-note">
        You will be redirected to Paystack's secure payment page
      </p>
    </div>
  );
};

export default PaystackPayment;
