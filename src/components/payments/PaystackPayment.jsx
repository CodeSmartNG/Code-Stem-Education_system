// src/components/payments/PaystackPayment.jsx
import React, { useState, useEffect } from 'react';
import { apiCall, getCurrentUser } from '../../utils/storageAPI';

const PaystackPayment = ({ lesson, student, onSuccess, onClose }) => {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const [currentUser, setCurrentUser] = useState(student || null);
  const [scriptReady, setScriptReady] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (window.PaystackPop) {
      setScriptReady(true);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.async = true;
    s.onload = () => setScriptReady(true);
    s.onerror = () => console.error('Paystack script failed to load');
    document.body.appendChild(s);
  }, []);

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

  const handlePay = () => {
    if (!publicKey) {
      alert('Payment not configured. Contact support.');
      return;
    }
    if (!window.PaystackPop) {
      alert('Payment is loading. Please try again.');
      return;
    }

    setProcessing(true);
    const ref = `lesson_${lesson.id}_${uid}_${Date.now()}`;

    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: Math.round(lesson.price * 100),
        currency: 'NGN',
        ref: ref,
        metadata: {
          custom_fields: [
            { display_name: 'Student', variable_name: 'student_name', value: name },
            { display_name: 'Lesson', variable_name: 'lesson_title', value: lesson.title || 'Lesson' },
          ],
        },
        callback: (response) => {
          apiCall('/payments/verify', {
            method: 'POST',
            body: JSON.stringify({
              reference: response.reference,
              lessonId: lesson.id,
              courseId: lesson.courseId,
              teacherId: lesson.teacherId,
            }),
          })
            .then((v) => {
              if (v?.success) {
                onSuccess({
                  paymentId: response.reference,
                  gateway: 'paystack',
                  amount: lesson.price,
                  lessonId: lesson.id,
                });
              } else {
                alert('Payment verification failed.');
                onClose();
              }
            })
            .catch((e) => {
              console.error(e);
              alert('Could not verify payment.');
              onClose();
            })
            .finally(() => setProcessing(false));
        },
        onClose: () => {
          setProcessing(false);
          onClose();
        },
      });
      handler.openIframe();
    } catch (err) {
      console.error('Paystack error:', err);
      alert('Could not open payment: ' + err.message);
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
        disabled={processing || !scriptReady}
      >
        {processing ? 'Processing...' : !scriptReady ? 'Loading...' : `Pay ₦${lesson.price} with Paystack`}
      </button>
      <p className="payment-note">
        You will be redirected to Paystack secure payment page
      </p>
    </div>
  );
};

export default PaystackPayment;
