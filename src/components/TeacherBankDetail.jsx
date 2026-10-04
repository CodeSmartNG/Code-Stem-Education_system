// src/components/TeacherBankDetails.jsx
import React, { useState } from 'react';
import { updateUser, getCurrentUser } from '../utils/storageAPI';

const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '035', name: 'ALAT by Wema' },
  { code: '50931', name: 'Bowen Microfinance Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '084', name: 'Enterprise Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank' },
  { code: '058', name: 'Guaranty Trust Bank' },
  { code: '030', name: 'Heritage Bank' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '526', name: 'Parallex Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank For Africa' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

const TeacherBankDetails = ({ currentUser, onUpdate }) => {
  const [bankDetails, setBankDetails] = useState({
    bankName: currentUser?.bankDetails?.bankName || '',
    bankCode: currentUser?.bankDetails?.bankCode || '',
    accountNumber: currentUser?.bankDetails?.accountNumber || '',
    accountName: currentUser?.bankDetails?.accountName || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBankDetails({ ...bankDetails, [name]: value });
    setMessage({ type: '', text: '' });
  };

  const handleBankSelect = (e) => {
    const selectedBank = NIGERIAN_BANKS.find((b) => b.name === e.target.value);
    setBankDetails({
      ...bankDetails,
      bankName: selectedBank?.name || '',
      bankCode: selectedBank?.code || '',
    });
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validation
    if (!bankDetails.bankName) {
      setMessage({ type: 'error', text: 'Please select a bank' });
      return;
    }
    if (!/^\d{10}$/.test(bankDetails.accountNumber)) {
      setMessage({ type: 'error', text: 'Account number must be exactly 10 digits' });
      return;
    }
    if (!bankDetails.accountName.trim()) {
      setMessage({ type: 'error', text: 'Please enter the account name' });
      return;
    }

    setIsSaving(true);

    try {
      const user = currentUser || (await getCurrentUser());
      const userId = user?.id || user?._id || user?.uid;

      if (!userId) {
        throw new Error('No user ID found. Please log in again.');
      }

      // ✅ Save to backend
      await updateUser(userId, {
        bankDetails: {
          bankName: bankDetails.bankName,
          bankCode: bankDetails.bankCode,
          accountNumber: bankDetails.accountNumber,
          accountName: bankDetails.accountName,
          updatedAt: new Date().toISOString(),
        },
      });

      setMessage({ type: 'success', text: '✅ Bank details saved successfully!' });

      // Notify parent if it wants to react
      if (typeof onUpdate === 'function') {
        onUpdate(userId, { bankDetails });
      }
    } catch (error) {
      console.error('Error saving bank details:', error);
      setMessage({
        type: 'error',
        text: '❌ Failed to save: ' + (error.message || 'Unknown error'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="form-container">
      <h2>💳 Bank Account Details</h2>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Used for receiving payouts from your lesson sales.
      </p>

      {message.text && (
        <div
          style={{
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            background: message.type === 'error' ? '#fed7d7' : '#d5f4e6',
            color: message.type === 'error' ? '#822727' : '#276749',
            fontSize: 14,
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
            Bank Name *
          </label>
          <select
            name="bankName"
            value={bankDetails.bankName}
            onChange={handleBankSelect}
            required
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
          >
            <option value="">-- Select your bank --</option>
            {NIGERIAN_BANKS.map((bank) => (
              <option key={bank.code + bank.name} value={bank.name}>
                {bank.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
            Account Number *
          </label>
          <input
            type="text"
            name="accountNumber"
            placeholder="10-digit account number"
            value={bankDetails.accountNumber}
            onChange={handleChange}
            maxLength={10}
            pattern="\d{10}"
            required
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>
            Account Name *
          </label>
          <input
            type="text"
            name="accountName"
            placeholder="Name as it appears on your bank account"
            value={bankDetails.accountName}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #ccc' }}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          style={{
            padding: '12px 24px',
            background: isSaving ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {isSaving ? 'Saving...' : '💾 Save Bank Details'}
        </button>
      </form>

      <p style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
        ⚠️ Make sure the account name matches your bank account exactly. Incorrect details
        will cause payouts to fail.
      </p>
    </div>
  );
};

export default TeacherBankDetails;
