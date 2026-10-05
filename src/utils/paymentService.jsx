// src/utils/paymentService.js
// Payment service — real Paystack integration happens in PaystackPayment.jsx

export const paymentService = {
  // Kept for backward compatibility — returns empty array
  getUserTransactions: (userId) => {
    try {
      return JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]');
    } catch {
      return [];
    }
  },

  savePendingTransaction: (transaction) => {
    try {
      const transactions = JSON.parse(localStorage.getItem('hausaStem_transactions') || '[]');
      transactions.push(transaction);
      localStorage.setItem('hausaStem_transactions', JSON.stringify(transactions));
    } catch (err) {
      console.error('Error saving transaction:', err);
    }
  },

  getAllTransactions: () => {
    try {
      return JSON.parse(localStorage.getItem('hausaStem_transactions') || '[]');
    } catch {
      return [];
    }
  },
};

export const paymentConfig = {
  paystack: { publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '' },
  supportedBanks: ['OPAY', 'PALMPAY', 'GTB', 'ZENITH', 'ACCESS', 'UBA'],
  supportedMobileMoney: ['OPAY', 'PALMPAY'],
};

export default paymentService;
