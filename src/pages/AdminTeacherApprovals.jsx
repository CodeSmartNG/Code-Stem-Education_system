// src/pages/RegisterTeacherPage.jsx

import React from 'react';
import TeacherRegisterForm from '../components/TeacherRegisterForm';
import { registerUser } from '../utils/storageAPI';

const RegisterTeacherPage = () => {
  const handleRegister = async (formData) => {
    try {
      const result = await registerUser({
        name: formData.name || formData.fullName || 'Teacher',
        email: formData.email,
        password: formData.password,
        role: 'teacher',
        whatsappNumber: formData.whatsappNumber || ''
      });

      alert(
        '✅ Registration successful! Please check your email for confirmation. ' +
        'Your account will be reviewed by an admin before you can log in.'
      );
      return true;
    } catch (err) {
      console.error('Teacher registration error:', err);
      alert(err.message || 'Registration failed. Please try again.');
      return false;
    }
  };

  const handleSwitchToLogin = () => {
    // Add navigation logic here if using React Router:
    // navigate('/login');
    // Or use window.location:
    window.location.href = '/';
  };

  return (
    <TeacherRegisterForm
      onRegister={handleRegister}
      onSwitchToLogin={handleSwitchToLogin}
    />
  );
};

export default RegisterTeacherPage;
