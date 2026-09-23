// middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please authenticate.'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // authController.js creates token with { id, role, email }
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.'
      });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please authenticate.'
      });
    }

    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;

    next();

  } catch (error) {
    console.error('Auth middleware error:', error.message);

    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please authenticate.'
    });
  }
};

// ============================================
// ADMIN
// ============================================

const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }

  next();
};

// ============================================
// TEACHER
// ============================================

const isTeacher = (req, res, next) => {
  if (
    !req.user ||
    (req.user.role !== 'teacher' && req.user.role !== 'admin')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Teacher only.'
    });
  }

  next();
};

// ============================================
// STUDENT
// ============================================

const isStudent = (req, res, next) => {
  if (
    !req.user ||
    (req.user.role !== 'student' && req.user.role !== 'admin')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Student only.'
    });
  }

  next();
};

module.exports = {
  auth,
  isAdmin,
  isTeacher,
  isStudent
};
