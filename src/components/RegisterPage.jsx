import React, { useState } from 'react';
import RegisterForm from './RegisterForm';
import { api } from '../services/api';

const RegisterPage = () => {
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async (name, email, password) => {
    setIsRegistering(true);
    
    try {
      const response = await api.auth.register({
        fullName: name,
        email: email,
        password: password
      });
      
      console.log('✅ Registration successful:', response);
      return response;
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSwitchToLogin = (type) => {
    console.log('Switch to:', type || 'login');
    // Navigate to login page
    // If using React Router:
    // navigate('/login');
  };

  return (
    <RegisterForm
      onRegister={handleRegister}
      onSwitchToLogin={handleSwitchToLogin}
      isRegistering={isRegistering}
    />
  );
};

export default RegisterPage;