// src/components/payments/PaystackPayment.jsx
import React, { useState, useEffect } from 'react';
import { apiCall, getCurrentUser } from '../../utils/storageAPI';

const PaystackPayment = ({ lesson, student, onSuccess, onClose }) => {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const [currentUser, setCurrentUser] = useState(student || null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const u = await getCurrentUser();
      if (u) setCurrentUser(u);
    };
    if (!student?.email) fetchUser();
  }, [student]);

  // ✅ Load Paystack script manually
  useEffect(() => {
    if (window.PaystackPop) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  const userEmail = student?.email || currentUser?.email || 'student@example.com';
  const userName = student?.name || currentUser?.name || 'Student';
  const userId = student?.id || student?._id || currentUser?.id || currentUser?._id || 'unknown';

  const handlePayment = async () => {
    if (!publicKey) {
      alert('Payment is not configured. Please contact support.');
      return;
    }
    if (!scriptLoaded || !window.PaystackPop) {
      alert('Payment is loading. Please try again in a moment.');
      return;
    }

    setProcessing(true);
    const reference = `lesson_${lesson.id}_${userId}_${Date.now()}`;

    try {
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: userEmail,
        amount: Math.round(lesson.price * 100),
        currency: 'NGN',
        ref: reference,
        metadata: {
          custom_fields: [
            { display_name: 'Student Name', variable_name: 'student_name', value: userName },
            { display_name: 'Lesson', variable_name: 'lesson_title', value: lesson.title || 'Lesson' },
            { display_name: 'Course', variable_name: 'course_id', value: lesson.courseId || '' },
          ],
        },
        callback: async function (response) {
          console.log('✅ Paystack callback:', response);
          try {
            const verification = await apiCall('/payments/verify', {
              method: 'POST',
              body: JSON.stringify({
                reference: response.reference,
                lessonId: lesson.id,
                courseId: lesson.courseId,
                teacherId: lesson.teacherId,
              }),
            });
            if (verification?.success) {
              onSuccess({
                paymentId: response.reference,
                gateway: 'paystack',
                amount: lesson.price,
                lessonId: lesson.id,
              });
            } else {
              alert('❌ Payment verification failed.');
              onClose();
            }
          } catch (err) {
            console.error('Verify error:', err);
            alert('❌ Could not verify payment.');
            onClose();
          } finally {
            setProcessing(false);
          }
        },
        onClose: function () {
          console.log('Payment window closed');
          setProcessing(false);
          onClose();
        },
      });
      handler.openIframe();
    } catch (err) {
      console.error('Paystack error:', err);
      alert('❌ Could not open payment: ' + err.message);
      setProcessing(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="paystack-payment">
        <p style={{ color: 'red' }}>Payment is not configured. Please contact support.</p>
      </div>
    );
  }

  return (
    <div className="paystack-payment">
      <button
        onClick={handlePayment}
        className="payment-btn paystack-btn"
        disabled={processing || !scriptLoaded}
      >
        {processing ? 'Processing...' : !scriptLoaded ? 'Loading payment...' : `Pay ₦${lesson.price} with Paystack`}
      </button>
      <p className="payment-note">
        You will be redirected to Paystack secure payment page
      </p>
    </div>
  );
};

export default PaystackPayment;
