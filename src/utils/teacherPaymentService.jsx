// src/utils/teacherPaymentService.jsx
// ✅ Real backend integration — no more stubs

import { apiCall } from './storageAPI';

// ============================================
// PROCESS TEACHER PAYMENT
// Called from PaymentModal after student pays.
// Backend verifies the reference with Paystack
// and credits the teacher's wallet.
// ============================================
export const processTeacherPayment = async (paymentData, lesson, student) => {
  try {
    console.log('💰 processTeacherPayment:', {
      reference: paymentData?.paymentId,
      lessonId: lesson?.id,
      teacherId: lesson?.teacherId,
    });

    const reference = paymentData?.paymentId || paymentData?.reference;
    const lessonId = lesson?.id || lesson?._id;
    const courseId = lesson?.courseId;
    const teacherId = lesson?.teacherId;

    if (!reference || !lessonId) {
      throw new Error('Missing reference or lessonId');
    }

    // ✅ Backend verifies with Paystack + credits teacher wallet
    const response = await apiCall('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ reference, lessonId, courseId, teacherId }),
    });

    if (!response?.success) {
      throw new Error(response?.message || 'Payment verification failed');
    }

    console.log('✅ Payment verified + teacher credited:', response.data);

    return {
      success: true,
      message: 'Payment verified and teacher credited',
      data: response.data,
    };
  } catch (error) {
    console.error('❌ processTeacherPayment error:', error);
    return {
      success: false,
      message: error.message || 'Payment processing failed',
    };
  }
};

// ============================================
// TEACHER EARNINGS / TRANSACTIONS
// ============================================

export const getTeacherEarnings = async (teacherId) => {
  try {
    const response = await apiCall(`/users/${teacherId}`);
    const user = response?.user || response?.data;

    return {
      totalEarnings: user?.wallet?.totalEarnings || 0,
      pendingPayout: user?.wallet?.pendingWithdrawals || 0,
      paidOut: user?.wallet?.paidOut || 0,
      balance: user?.wallet?.balance || 0,
      transactions: user?.wallet?.transactions || [],
    };
  } catch (error) {
    console.error('getTeacherEarnings error:', error);
    return {
      totalEarnings: 0,
      pendingPayout: 0,
      paidOut: 0,
      balance: 0,
      transactions: [],
    };
  }
};

export const getTeacherTransactions = async (teacherId) => {
  try {
    const earnings = await getTeacherEarnings(teacherId);
    return earnings.transactions;
  } catch (error) {
    console.error('getTeacherTransactions error:', error);
    return [];
  }
};

export const getPlatformEarnings = async () => {
  try {
    const response = await apiCall('/admin/platform-earnings');
    return response?.data || {
      totalEarnings: 0,
      totalTransactions: 0,
      transactions: [],
    };
  } catch (error) {
    console.error('getPlatformEarnings error:', error);
    return { totalEarnings: 0, totalTransactions: 0, transactions: [] };
  }
};

export const getAllTransactions = async () => {
  try {
    const response = await apiCall('/admin/transactions');
    return response?.data || [];
  } catch (error) {
    console.error('getAllTransactions error:', error);
    return [];
  }
};

// ============================================
// BANK ACCOUNT
// ============================================

export const saveTeacherBankAccount = async (teacherId, bankDetails) => {
  try {
    const response = await apiCall(`/users/${teacherId}`, {
      method: 'PUT',
      body: JSON.stringify({ bankDetails }),
    });
    return response?.user?.bankDetails || bankDetails;
  } catch (error) {
    console.error('saveTeacherBankAccount error:', error);
    throw error;
  }
};

export const getTeacherBankAccount = async (teacherId) => {
  try {
    const response = await apiCall(`/users/${teacherId}`);
    const user = response?.user || response?.data;
    return user?.bankDetails || null;
  } catch (error) {
    console.error('getTeacherBankAccount error:', error);
    return null;
  }
};

// ============================================
// PAYOUTS
// ============================================

export const processPendingPayouts = async () => {
  try {
    const response = await apiCall('/admin/process-payouts', {
      method: 'POST',
    });
    return response?.data || [];
  } catch (error) {
    console.error('processPendingPayouts error:', error);
    return [];
  }
};

export default {
  processTeacherPayment,
  getTeacherEarnings,
  getPlatformEarnings,
  getTeacherTransactions,
  getAllTransactions,
  saveTeacherBankAccount,
  getTeacherBankAccount,
  processPendingPayouts,
};
