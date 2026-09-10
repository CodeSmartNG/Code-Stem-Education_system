// src/utils/storageAPI.js

import { api } from './api';  // ✅ Correct - uses named export

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
    // Transform data for backend
    const registerData = {
      fullName: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'student'
    };

    const response = await api.register(registerData);
    
    if (response.success) {
      // Store token if returned
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
    const response = await api.confirmEmail(token);
    return response.user;
  } catch (error) {
    console.error('Error confirming email:', error);
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
    return response.courses || [];
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
    return response.course;
  } catch (error) {
    console.error('Error creating course:', error);
    throw error;
  }
};

export const updateCourse = async (courseId, updateData) => {
  try {
    const response = await api.updateCourse(courseId, updateData);
    return response.course;
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
    const students = await getStudents();

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
    return {
      totalCourses: 0,
      totalLessons: 0,
      totalStudents: 0
    };
  }
};

// ============================================
// LESSON MANAGEMENT
// ============================================

export const getLessonsByCourse = async (courseId) => {
  try {
    const response = await api.getLessons(courseId);
    return response.lessons || [];
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
    return response.lesson;
  } catch (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }
};

export const updateLesson = async (lessonId, updateData) => {
  try {
    const response = await api.updateLesson(lessonId, updateData);
    return response.lesson;
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
    const response = await apiCall(`/lessons/${lessonId}/access`, {
      method: 'GET',
      params: { userId, courseKey }
    });
    return response.hasAccess || false;
  } catch (error) {
    console.error('Error checking access:', error);
    return false;
  }
};

export const purchaseLesson = async (userId, courseKey, lessonId) => {
  try {
    const response = await api.purchaseLesson({ 
      userId, 
      courseKey, 
      lessonId 
    });
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
    return response.courses || [];
  } catch (error) {
    console.error('Error getting all courses:', error);
    return [];
  }
};

export const getCourseDetailsForAdmin = async (courseId) => {
  try {
    const response = await api.getCourseById(courseId);
    return response.course;
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
    return {
      balance: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0,
      transactions: []
    };
  }
};

export const updateTeacherWallet = async (teacherId, walletData) => {
  try {
    const response = await api.updateUser(teacherId, {
      wallet: walletData
    });
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
      body: { teacherId, amount, bankDetails }
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
      body: {
        lessonId,
        ...quizData
      }
    });
    return response.quiz;
  } catch (error) {
    console.error('Error creating quiz:', error);
    throw error;
  }
};

// ============================================
// EXPORT ALL
// ============================================

export default {
  // User Management
  getCurrentUser,
  authenticateUser,
  registerUser,
  logoutUser,
  getUsers,
  getStudents,
  updateStudent,
  confirmUserEmail,
  resendEmailConfirmation,

  // Course Management
  getCourses,
  getCoursesByTeacher,
  createCourse,
  updateCourse,
  deleteCourse,
  getTeacherStats,

  // Lesson Management
  getLessonsByCourse,
  createLesson,
  updateLesson,
  deleteLesson,

  // Multimedia
  uploadFileToFirebase,

  // Quiz
  createQuiz,

  // Wallet & Payment
  getTeacherWallet,
  updateTeacherWallet,
  withdrawFromWallet,

  // WhatsApp
  updateTeacherProfileWithWhatsApp,
  getTeacherWhatsAppUrl,
  getTeacherWhatsAppNumber,

  // Lesson Access & Purchase
  canAccessLesson,
  purchaseLesson,

  // Admin
  getAllCoursesForAdmin,
  getCourseDetailsForAdmin,
  getAllTeachers,
  getPendingTeachers,
  approveTeacher,
  rejectTeacher,
  dismissTeacher,
  getPlatformStats,

  // Storage
  initializeStorage
};
