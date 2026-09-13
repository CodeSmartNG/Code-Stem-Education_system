// src/utils/teacherPaymentService.jsx
// ✅ Stub version - custom backend handles real payouts

export const processTeacherPayment = async (paymentData, lesson, student) => {
  console.log('💰 Teacher payment (stub):', { paymentData, lesson, student });
  return { success: true, message: 'Payment processed via backend' };
};

export const getTeacherEarnings = async (teacherId) => ({
  totalEarnings: 0,
  pendingPayout: 0,
  paidOut: 0,
  transactions: []
});

export const getPlatformEarnings = async () => ({
  totalEarnings: 0,
  totalTransactions: 0,
  transactions: []
});

export const getTeacherTransactions = async (teacherId) => [];
export const getAllTransactions = async () => [];
export const saveTeacherBankAccount = async () => true;
export const getTeacherBankAccount = async () => null;
export const processPendingPayouts = async () => [];

export default {
  processTeacherPayment,
  getTeacherEarnings,
  getPlatformEarnings,
  getTeacherTransactions,
  getAllTransactions,
  saveTeacherBankAccount,
  getTeacherBankAccount,
  processPendingPayouts
};