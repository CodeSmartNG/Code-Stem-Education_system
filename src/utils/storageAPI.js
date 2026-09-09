// src/utils/storageAPI.js

import { api } from './api';

// ============================================
// USER MANAGEMENT
// ============================================

export const getCurrentUser = async () => {
  try {
    const response = await api.getMe();
    return response.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const authenticateUser = async (email, password) => {
  try {
    const response = await api.login({ email, password });
    if (response.success) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response.user;
    }
    return null;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await api.register(userData);
    if (response.success) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      return response.user;
    }
    return null;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  api.logout();
  return true;
};

// ============================================
// COURSE MANAGEMENT
// ============================================

export const getCourses = async () => {
  try {
    const response = await api.getCourses();
    return response.data || [];
  } catch (error) {
    console.error('Error getting courses:', error);
    return [];
  }
};

export const getCoursesByTeacher = async (teacherId) => {
  try {
    const courses = await getCourses();
    return courses.filter(c => c.teacherId === teacherId);
  } catch (error) {
    console.error('Error getting teacher courses:', error);
    return [];
  }
};

export const createCourse = async (courseData) => {
  try {
    const response = await api.createCourse(courseData);
    return response.data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

export const updateCourse = async (courseId, updateData) => {
  try {
    const response = await api.updateCourse(courseId, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating course:', error);
    throw error;
  }
};

export const deleteCourse = async (courseId) => {
  try {
    await api.deleteCourse(courseId);
    return true;
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

export const publishCourse = async (courseId, isPublished) => {
  try {
    const response = await api.publishCourse(courseId, isPublished);
    return response.data;
  } catch (error) {
    console.error('Error publishing course:', error);
    throw error;
  }
};

// ============================================
// LESSON MANAGEMENT
// ============================================

export const getLessonsByCourse = async (courseId) => {
  try {
    const response = await api.getLessons(courseId);
    return response.data || [];
  } catch (error) {
    console.error('Error getting lessons:', error);
    return [];
  }
};

export const createLesson = async (courseId, lessonData) => {
  try {
    const response = await api.createLesson({
      ...lessonData,
      courseId
    });
    return response.data;
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
};

export const updateLesson = async (lessonId, updateData) => {
  try {
    const response = await api.updateLesson(lessonId, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }
};

export const deleteLesson = async (lessonId) => {
  try {
    await api.deleteLesson(lessonId);
    return true;
  } catch (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }
};

// ============================================
// MULTIMEDIA MANAGEMENT
// ============================================

export const uploadFileToFirebase = async (file, path) => {
  // This will use your backend instead of Firebase Storage
  try {
    const response = await api.uploadVideo(file);
    return response.data.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const uploadMultimedia = async (file) => {
  try {
    const response = await api.uploadMultimedia(file);
    return response.data;
  } catch (error) {
    console.error('Error uploading multimedia:', error);
    throw error;
  }
};

// ============================================
// WALLET & PAYMENTS
// ============================================

export const getTeacherWallet = async (teacherId) => {
  try {
    const response = await api.getUserById(teacherId);
    return response.data?.wallet || {
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: []
    };
  } catch (error) {
    console.error('Error getting teacher wallet:', error);
    return {
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: []
    };
  }
};

export const withdrawFromWallet = async (teacherId, amount, bankDetails) => {
  try {
    // Implement withdrawal endpoint in backend
    const response = await apiCall('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ teacherId, amount, bankDetails })
    });
    return response.data;
  } catch (error) {
    console.error('Error withdrawing:', error);
    throw error;
  }
};

// ============================================
// WHATSAPP
// ============================================

export const updateTeacherProfileWithWhatsApp = async (teacherId, data) => {
  try {
    const response = await api.updateUser(teacherId, {
      whatsappNumber: data.whatsappNumber
    });
    return response.data;
  } catch (error) {
    console.error('Error updating WhatsApp:', error);
    throw error;
  }
};

export const getTeacherWhatsAppUrl = (teacherId) => {
  return `https://wa.me/${teacherId}`;
};

export const getTeacherWhatsAppNumber = async (teacherId) => {
  try {
    const response = await api.getUserById(teacherId);
    return response.data?.whatsappNumber || '';
  } catch (error) {
    console.error('Error getting WhatsApp number:', error);
    return '';
  }
};

// ============================================
// LESSON ACCESS & PURCHASE
// ============================================

export const canAccessLesson = async (userId, courseKey, lessonId) => {
  // Implement in backend
  try {
    const response = await apiCall(`/lessons/${lessonId}/access`, {
      method: 'GET'
    });
    return response.data?.hasAccess || false;
  } catch (error) {
    console.error('Error checking access:', error);
    return false;
  }
};

export const purchaseLesson = async (userId, courseKey, lessonId) => {
  try {
    const response = await apiCall('/lessons/purchase', {
      method: 'POST',
      body: JSON.stringify({ userId, courseKey, lessonId })
    });
    return response.success;
  } catch (error) {
    console.error('Error purchasing lesson:', error);
    throw error;
  }
};

// ============================================
// EXPORT ALL
// ============================================

export default {
  getCurrentUser,
  authenticateUser,
  registerUser,
  logoutUser,
  getCourses,
  getCoursesByTeacher,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  getLessonsByCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  uploadFileToFirebase,
  uploadMultimedia,
  getTeacherWallet,
  withdrawFromWallet,
  updateTeacherProfileWithWhatsApp,
  getTeacherWhatsAppUrl,
  getTeacherWhatsAppNumber,
  canAccessLesson,
  purchaseLesson
};