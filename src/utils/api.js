// src/utils/api.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper to get auth token
const getToken = () => localStorage.getItem('token');

// Helper for API calls
const apiCall = async (endpoint, options = {}) => {
  const token = getToken();
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  // If FormData, remove Content-Type (browser will set it)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const api = {
  // ============================================
  // AUTH
  // ============================================
  
  register: (userData) => apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),

  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),

  getMe: () => apiCall('/auth/me'),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // ============================================
  // USERS
  // ============================================
  
  getUsers: () => apiCall('/users'),
  
  getUserById: (id) => apiCall(`/users/${id}`),
  
  updateUser: (id, data) => apiCall(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  deleteUser: (id) => apiCall(`/users/${id}`, {
    method: 'DELETE'
  }),

  // ============================================
  // COURSES
  // ============================================
  
  getCourses: () => apiCall('/courses'),
  
  getCourseById: (id) => apiCall(`/courses/${id}`),
  
  createCourse: (data) => apiCall('/courses', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  updateCourse: (id, data) => apiCall(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  deleteCourse: (id) => apiCall(`/courses/${id}`, {
    method: 'DELETE'
  }),
  
  publishCourse: (id, isPublished) => apiCall(`/courses/${id}/publish`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublished })
  }),

  // ============================================
  // LESSONS
  // ============================================
  
  getLessons: (courseId) => apiCall(`/lessons?courseId=${courseId}`),
  
  getLessonById: (id) => apiCall(`/lessons/${id}`),
  
  createLesson: (data) => apiCall('/lessons', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  updateLesson: (id, data) => apiCall(`/lessons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  deleteLesson: (id) => apiCall(`/lessons/${id}`, {
    method: 'DELETE'
  }),

  // ============================================
  // UPLOAD
  // ============================================
  
  uploadVideo: (file) => {
    const formData = new FormData();
    formData.append('video', file);
    return apiCall('/upload/video', {
      method: 'POST',
      body: formData
    });
  },
  
  uploadMultimedia: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiCall('/upload/multimedia', {
      method: 'POST',
      body: formData
    });
  }
};