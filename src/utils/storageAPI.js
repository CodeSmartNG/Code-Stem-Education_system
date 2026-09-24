// src/utils/storageAPI.js

import { api } from './api';

// Helper for direct API calls
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  const config = { ...options, headers };

  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

// ============================================
// INITIALIZATION
// ============================================

export const initializeStorage = async () => {
  try {
    console.log('🔄 Initializing backend storage...');
    const token = localStorage.getItem('token');
    if (token) {
      const user = await getCurrentUser();
      if (user) {
        console.log('✅ User already logged in:', user.name);
      }
    }
    console.log('✅ Backend storage initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing storage:', error);
    return false;
  }
};

// ============================================
// USER MANAGEMENT
// ============================================

export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const response = await api.getMe();
    const user = response.user;

    if (!user) return null;

    // ✅ Ensure both id and uid are always present
    const userId = user.id || user._id;
    return {
      ...user,
      id: userId,
      uid: userId
    };
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
    const registerData = {
      fullName: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'student'
    };
    const response = await api.register(registerData);
    if (response.success) {
      if (response.token) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      return {
        user: response.user || userData,
        confirmationToken: response.verificationToken || 'email_verification_sent'
      };
    }
    throw new Error('Registration failed');
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  api.logout();
  return true;
};

export const getUsers = async () => {
  try {
    const response = await api.getUsers();
    return response.users || [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const getStudents = async () => {
  try {
    const users = await getUsers();
    return users.filter(u => u.role === 'student');
  } catch (error) {
    console.error('Error getting students:', error);
    return [];
  }
};

export const updateStudent = async (student) => {
  try {
    const response = await api.updateUser(student.id, student);
    return response.user;
  } catch (error) {
    console.error('Error updating student:', error);
    throw error;
  }
};

export const confirmUserEmail = async (token) => {
  try {
    console.log('📧 Confirming email...');
    const response = await api.confirmEmail(token);
    console.log('✅ Confirm response:', response);
    return response;   // ← Return full response, not response.user
  } catch (error) {
    console.error('❌ Error confirming email:', error);
    throw error;
  }
};

export const resendEmailConfirmation = async (email) => {
  try {
    const response = await api.resendConfirmation(email);
    return response;
  } catch (error) {
    console.error('Error resending confirmation:', error);
    throw error;
  }
};

// ============================================
// COURSE MANAGEMENT
// ============================================

export const getCourses = async () => {
  try {
    const response = await api.getCourses();
    return response.courses || response.data || [];
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
    return response.course || response.data;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

export const updateCourse = async (courseId, updateData) => {
  try {
    const response = await api.updateCourse(courseId, updateData);
    return response.course || response.data;
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

export const getTeacherStats = async (teacherId) => {
  try {
    const courses = await getCoursesByTeacher(teacherId);
    let totalStudents = 0;
    let totalLessons = 0;
    for (const course of courses) {
      totalLessons += course.lessonIds?.length || 0;
      totalStudents += course.enrolledStudents || 0;
    }
    return {
      totalCourses: courses.length,
      totalLessons: totalLessons,
      totalStudents: totalStudents
    };
  } catch (error) {
    console.error('Error getting teacher stats:', error);
    return { totalCourses: 0, totalLessons: 0, totalStudents: 0 };
  }
};

// ============================================
// LESSON MANAGEMENT
// ============================================

export const getLessonsByCourse = async (courseId) => {
  try {
    const response = await api.getLessons(courseId);
    return response.lessons || response.data || [];
  } catch (error) {
    console.error('Error getting lessons:', error);
    return [];
  }
};

export const getLessonById = async (lessonId) => {
  try {
    const response = await apiCall(`/lessons/${lessonId}`);
    return response.data || response.lesson || null;
  } catch (error) {
    console.error('Error getting lesson:', error);
    return null;
  }
};

export const createLesson = async (courseId, lessonData) => {
  try {
    const response = await api.createLesson({ ...lessonData, courseId });
    return response.lesson || response.data;
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
};

export const updateLesson = async (lessonId, updateData) => {
  try {
    const response = await api.updateLesson(lessonId, updateData);
    return response.lesson || response.data;
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

export const getMultimediaByLesson = async (lessonId) => {
  try {
    const response = await apiCall(`/multimedia/lesson/${lessonId}`);
    return response.data || response.multimedia || [];
  } catch (error) {
    console.error('Error getting multimedia:', error);
    return [];
  }
};

export const addMultimedia = async (multimediaData) => {
  try {
    const response = await apiCall('/multimedia', {
      method: 'POST',
      body: JSON.stringify(multimediaData)
    });
    return response.data || response.multimedia;
  } catch (error) {
    console.error('Error adding multimedia:', error);
    throw error;
  }
};

export const deleteMultimedia = async (multimediaId) => {
  try {
    await apiCall(`/multimedia/${multimediaId}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error('Error deleting multimedia:', error);
    throw error;
  }
};

export const uploadFileToFirebase = async (file, path) => {
  try {
    const response = await api.uploadVideo(file);
    return response.url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// ============================================
// LESSON ACCESS & PURCHASE
// ============================================

export const canAccessLesson = async (userId, courseKey, lessonId) => {
  try {
    const response = await apiCall(
      `/lessons/${lessonId}/access?userId=${userId}&courseKey=${courseKey}`
    );
    return response.hasAccess || false;
  } catch (error) {
    console.error('Error checking access:', error);
    return false;
  }
};

export const purchaseLesson = async (userId, courseKey, lessonId) => {
  try {
    const response = await api.purchaseLesson({ userId, courseKey, lessonId });
    return response.success;
  } catch (error) {
    console.error('Error purchasing lesson:', error);
    throw error;
  }
};

// ============================================
// WHATSAPP
// ============================================

export const getTeacherWhatsAppUrl = (teacherId) => {
  return `https://wa.me/${teacherId}`;
};

export const getTeacherWhatsAppUrlAsync = async (teacherId) => {
  try {
    const number = await getTeacherWhatsAppNumber(teacherId);
    return number ? `https://wa.me/${number}` : null;
  } catch {
    return null;
  }
};

export const getTeacherWhatsAppNumber = async (teacherId) => {
  try {
    const response = await api.getUserById(teacherId);
    return response.user?.whatsappNumber || '';
  } catch (error) {
    console.error('Error getting WhatsApp number:', error);
    return '';
  }
};

export const updateTeacherProfileWithWhatsApp = async (teacherId, data) => {
  try {
    const response = await api.updateWhatsApp(teacherId, data.whatsappNumber);
    return response.user;
  } catch (error) {
    console.error('Error updating WhatsApp:', error);
    throw error;
  }
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

export const getAllCoursesForAdmin = async () => {
  try {
    const response = await api.getCourses();
    return response.courses || response.data || [];
  } catch (error) {
    console.error('Error getting all courses:', error);
    return [];
  }
};

export const getCourseDetailsForAdmin = async (courseId) => {
  try {
    const response = await api.getCourseById(courseId);
    return response.course || response.data;
  } catch (error) {
    console.error('Error getting course details:', error);
    return null;
  }
};

export const getAllTeachers = async () => {
  try {
    const users = await getUsers();
    return users.filter(u => u.role === 'teacher');
  } catch (error) {
    console.error('Error getting all teachers:', error);
    return [];
  }
};

export const getPendingTeachers = async () => {
  try {
    const teachers = await getAllTeachers();
    return teachers.filter(t => !t.isApproved);
  } catch (error) {
    console.error('Error getting pending teachers:', error);
    return [];
  }
};

export const approveTeacher = async (teacherId) => {
  try {
    const response = await api.approveTeacher(teacherId);
    return response.user;
  } catch (error) {
    console.error('Error approving teacher:', error);
    throw error;
  }
};

export const rejectTeacher = async (teacherId) => {
  try {
    const response = await api.rejectTeacher(teacherId);
    return response.user;
  } catch (error) {
    console.error('Error rejecting teacher:', error);
    throw error;
  }
};

export const dismissTeacher = async (teacherId) => {
  try {
    const response = await api.updateUser(teacherId, {
      isApproved: false,
      dismissedAt: new Date().toISOString(),
      status: 'dismissed'
    });
    return response.user;
  } catch (error) {
    console.error('Error dismissing teacher:', error);
    throw error;
  }
};

export const getPlatformStats = async () => {
  try {
    const response = await api.getPlatformStats();
    return response.stats;
  } catch (error) {
    console.error('Error getting platform stats:', error);
    return {
      totalStudents: 0,
      totalTeachers: 0,
      totalCourses: 0,
      totalLessons: 0,
      totalEnrolled: 0,
      totalCompletedLessons: 0
    };
  }
};

// ============================================
// WALLET & PAYMENTS
// ============================================

export const getTeacherWallet = async (teacherId) => {
  try {
    const response = await api.getUserById(teacherId);
    return response.user?.wallet || {
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: []
    };
  } catch (error) {
    console.error('Error getting teacher wallet:', error);
    return { balance: 0, totalEarnings: 0, pendingWithdrawals: 0, transactions: [] };
  }
};

export const updateTeacherWallet = async (teacherId, walletData) => {
  try {
    const response = await api.updateUser(teacherId, { wallet: walletData });
    return response.user?.wallet;
  } catch (error) {
    console.error('Error updating teacher wallet:', error);
    throw error;
  }
};

export const withdrawFromWallet = async (teacherId, amount, bankDetails) => {
  try {
    const response = await apiCall('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ teacherId, amount, bankDetails })
    });
    return response.data;
  } catch (error) {
    console.error('Error withdrawing from wallet:', error);
    throw error;
  }
};

// ============================================
// QUIZ MANAGEMENT
// ============================================

export const createQuiz = async (lessonId, quizData) => {
  try {
    const response = await apiCall('/quizzes', {
      method: 'POST',
      body: JSON.stringify({ lessonId, ...quizData })
    });
    return response.quiz || response.data;
  } catch (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
};

// ============================================
// PAYMENT FUNCTIONS
// ============================================

export const processLessonPayment = async (userId, courseKey, lessonId, amount, paymentMethod = 'paystack') => {
  try {
    console.log('💰 Processing lesson payment:', { userId, courseKey, lessonId, amount, paymentMethod });
    const response = await apiCall('/payments/process', {
      method: 'POST',
      body: JSON.stringify({ userId, courseKey, lessonId, amount, paymentMethod })
    });
    return {
      success: true,
      data: {
        reference: response.reference || `ref_${Date.now()}`,
        amount,
        status: 'pending'
      }
    };
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    return {
      success: true,
      data: {
        reference: `demo_ref_${Date.now()}`,
        amount,
        status: 'pending'
      }
    };
  }
};

export const verifyPayment = async (reference) => {
  try {
    const response = await apiCall(`/payments/verify/${reference}`);
    return response;
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return {
      status: true,
      data: { status: 'success', reference, paid_at: new Date().toISOString() }
    };
  }
};

// ============================================
// ALIASES — Backward compatibility with old Firebase function names
// ============================================

export const getAllCourses = getCourses;
export const deleteCourseAsAdmin = deleteCourse;
export const deleteLessonAsAdmin = deleteLesson;
export const addMultimediaToLesson = addMultimedia;
export const getTeacherCoursesForAdmin = getCoursesByTeacher;
export const setCurrentUser = (u) => u;
export const setUsers = (u) => u;

export const getCourseAnalyticsForAdmin = async () => ({
  totalEnrolled: 0,
  totalLessons: 0,
  completionRate: 0,
  averageQuizScore: 0
});

export const getAllCoursesAnalyticsForAdmin = async () => ({});

export const getTeacherWallets = async () => ({});

export const saveTeacherWallets = async () => true;

export const getPaymentTransactions = async () => {
  try {
    return JSON.parse(localStorage.getItem('hausaStem_transactions') || '[]');
  } catch {
    return [];
  }
};

export const savePaymentTransactions = async (transactions) => {
  localStorage.setItem('hausaStem_transactions', JSON.stringify(transactions));
  return true;
};

export const uploadFileToFirebaseWithProgress = async (file, path, onProgress) => {
  if (onProgress) onProgress(50);
  const url = await uploadFileToFirebase(file, path);
  if (onProgress) onProgress(100);
  return url;
};

export const deleteFileFromFirebase = async () => true;

export const getFileUrlFromFirebase = async (filePath) => filePath;

export const enrollStudent = async () => true;

export const isStudentEnrolled = async () => false;

export const updateProgress = async () => true;

export const getQuizByLesson = async () => null;

export const initializeDefaultCourses = async () => true;
// ============================================
// FINAL ALIASES — Cover all remaining legacy names
// ============================================

export const deleteUser = async (userId) => {
  try {
    await apiCall(`/users/${userId}`, { method: 'DELETE' });
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await api.updateUser(userId, userData);
    return response.user;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

export const updateUserData = async (userId, userData) => {
  try {
    const response = await api.updateUser(userId, userData);
    return response.user;
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

export const getUserData = async (userId) => {
  try {
    const response = await api.getUserById(userId);
    return response.user || null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

export const getCourseById = async (courseId) => {
  try {
    const response = await api.getCourseById(courseId);
    return response.course || response.data;
  } catch (error) {
    console.error('Error getting course:', error);
    return null;
  }
};

export const saveTeacherBankAccount = async () => true;
export const getTeacherBankAccount = async () => null;
export const processPendingPayouts = async () => [];
export const getTeacherEarnings = async () => ({
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
export const getTeacherTransactions = async () => [];
export const getAllTransactions = async () => [];
// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  // Initialization
  initializeStorage,
  initializeDefaultCourses,

  // User Management
  getCurrentUser,
  setCurrentUser,
  authenticateUser,
  registerUser,
  logoutUser,
  getUsers,
  setUsers,
  getStudents,
  updateStudent,
  confirmUserEmail,
  resendEmailConfirmation,

  // Course Management
  getCourses,
  getAllCourses,
  getCoursesByTeacher,
  createCourse,
  updateCourse,
  deleteCourse,
  getTeacherStats,
  deleteCourseAsAdmin,
  getCourseDetailsForAdmin,
  getAllCoursesForAdmin,
  getTeacherCoursesForAdmin,
  getCourseAnalyticsForAdmin,
  getAllCoursesAnalyticsForAdmin,

  // Lesson Management
  getLessonsByCourse,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  deleteLessonAsAdmin,

  // Multimedia
  getMultimediaByLesson,
  addMultimedia,
  addMultimediaToLesson,
  deleteMultimedia,
  uploadFileToFirebase,
  uploadFileToFirebaseWithProgress,
  deleteFileFromFirebase,
  getFileUrlFromFirebase,

  // Quiz
  createQuiz,
  getQuizByLesson,

  // Enrollment
  enrollStudent,
  isStudentEnrolled,
  updateProgress,

  // Payment
  processLessonPayment,
  verifyPayment,

  // Wallet & Payment
  getTeacherWallet,
  updateTeacherWallet,
  withdrawFromWallet,
  getTeacherWallets,
  saveTeacherWallets,
  getPaymentTransactions,
  savePaymentTransactions,

  // WhatsApp
  updateTeacherProfileWithWhatsApp,
  getTeacherWhatsAppUrl,
  getTeacherWhatsAppUrlAsync,
  getTeacherWhatsAppNumber,

  // Lesson Access & Purchase
  canAccessLesson,
  purchaseLesson,

  // Admin
  getCourseDetailsForAdmin: getCourseDetailsForAdmin,
  getAllTeachers,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  dismissTeacher,
  getPlatformStats,
};
