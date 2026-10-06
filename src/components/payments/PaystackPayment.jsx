// src/components/payments/PaystackPayment.jsx
import React, { useState, useEffect } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { apiCall, getCurrentUser } from '../../utils/storageAPI';

const PaystackPayment = ({ lesson, student, onSuccess, onClose }) => {
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  // ✅ Hooks first — must be before any return
  const [currentUser, setCurrentUser] = useState(student || null);

  useEffect(() => {
    const fetchUser = async () => {
      const u = await getCurrentUser();
      if (u) setCurrentUser(u);
    };
    if (!student?.email) {
      fetchUser();
    }
  }, [student]);

  // ✅ Early return AFTER hooks
  if (!publicKey) {
    console.error('❌ VITE_PAYSTACK_PUBLIC_KEY is not set');
    return (
      <div className="paystack-payment">
        <p style={{ color: 'red' }}>
          Payment is not configured. Please contact support.
        </p>
      </div>
    );
  }

  // ✅ Resolve reliable values with fallbacks
  const userEmail = student?.email || currentUser?.email || 'student@example.com';
  const userName = student?.name || currentUser?.name || 'Student';
  const userId =
    student?.id ||
    student?._id ||
    currentUser?.id ||
    currentUser?._id ||
    'unknown';

  const reference = `lesson_${lesson.id}_${userId}_${Date.now()}`;

  const config = {
    reference,
    email: userEmail,
    amount: Math.round(lesson.price * 100),
    publicKey,
    currency: 'NGN',
    metadata: {
      custom_fields: [
        {
          display_name: 'Student Name',
          variable_name: 'student_name',
          value: userName,
        },
        {
          display_name: 'Lesson',
          variable_name: 'lesson_title',
          value: lesson.title || 'Lesson',
        },
        {
          display_name: 'Course',
          variable_name: 'course_id',
          value: lesson.courseId || '',
        },
      ],
    },
  };

  const initializePayment = usePaystackPayment(config);

  const handlePaymentSuccess = async (response) => {
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
        alert('❌ Payment verification failed. Please contact support.');
        onClose();
      }
    } catch (error) {
      console.error('Payment verify error:', error);
      alert('❌ Could not verify payment. Please check your email for a receipt.');
      onClose();
    }
  };

  const handlePaymentClose = () => {
    console.log('Payment closed by user');
    onClose();
  };

  return (
    <div className="paystack-payment">
      <button
        onClick={() => {
          console.log('🎯 Tapped. Email:', userEmail);
          try {
            initializePayment({
              onSuccess: handlePaymentSuccess,
              onClose: handlePaymentClose,
            });
          } catch (err) {
            alert('❌ Error: ' + err.message + '\nEmail: ' + userEmail);
          }
        }}
        className="payment-btn paystack-btn"
      >
        Pay ₦{lesson.price} with Paystack
      </button>
      <p className="payment-note">
        You will be redirected to Paystack secure payment page
      </p>
    </div>
  );
};

export default PaystackPayment;
