// src/components/payments/PaystackPayment.jsx
import React, { useState, useEffect } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { apiCall, getCurrentUser } from '../../utils/storageAPI';
const PaystackPayment = ({ lesson, student, onSuccess, onClose }) => {
  // ✅ Vite env var
const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  // ✅ Fetch current user for a reliable email
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


// ✅ Resolve email safely
const userEmail = student?.email || currentUser?.email || 'student@example.com';
const userName = student?.name || currentUser?.name || 'Student';
const userId = student?.id || currentUser?.id || 'unknown';
  
  // ✅ Unique reference with lesson + student + timestamp
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
  amount: Math.round(lesson.price * 100), // kobo
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
      // ✅ IMPORTANT: Verify on the backend before unlocking
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
          // 🐛 DEBUG — show what's happening
          const debugInfo = [
            '🎯 Button tapped!',
            '',
            'Public Key: ' + (publicKey ? publicKey.substring(0, 20) + '...' : 'MISSING'),
            'Amount (kobo): ' + config.amount,
            'Email: ' + config.email,
            'Reference: ' + reference,
            'initializePayment: ' + typeof initializePayment,
            'PaystackPop loaded: ' + (typeof window.PaystackPop !== 'undefined'),
          ].join('\n');
          
          alert(debugInfo);

          // Try to call it
          try {
            if (typeof initializePayment !== 'function') {
              alert('❌ initializePayment is not a function! It is: ' + typeof initializePayment);
              return;
            }
            initializePayment({ 
              onSuccess: handlePaymentSuccess, 
              onClose: handlePaymentClose 
            });
          } catch (err) {
            alert('❌ Error calling initializePayment:\n' + err.message);
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
