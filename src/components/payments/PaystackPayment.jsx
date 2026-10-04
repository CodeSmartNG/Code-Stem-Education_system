// src/components/payments/PaystackPayment.jsx
import React from 'react';
import { usePaystackPayment } from 'react-paystack';
import { apiCall } from '../../utils/storageAPI'; // adjust path if needed

const PaystackPayment = ({ lesson, student, onSuccess, onClose }) => {
  // ✅ Vite env var
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

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

  // ✅ Unique reference with lesson + student + timestamp
  const reference = `lesson_${lesson.id}_${student.id}_${Date.now()}`;

  const config = {
    reference,
    email: student.email,
    amount: Math.round(lesson.price * 100), // kobo
    publicKey,
    currency: 'NGN',
    metadata: {
      custom_fields: [
        {
          display_name: 'Student Name',
          variable_name: 'student_name',
          value: student.name || 'Student',
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
        onClick={() => initializePayment({ onSuccess: handlePaymentSuccess, onClose: handlePaymentClose })}
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
