// backend/routes/auth.js

const express = require('express');

const {
  register,
  login,
  getMe,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');

const { auth } = require('../middleware/auth');

const router = express.Router();

// ============================================
// REGISTER
// POST /api/auth/register
// ============================================
router.post('/register', register);

// ============================================
// LOGIN
// POST /api/auth/login
// ============================================
router.post('/login', login);

// ============================================
// GET CURRENT USER
// GET /api/auth/me
// ============================================
router.get('/me', auth, getMe);

// ============================================
// VERIFY EMAIL
// GET /api/auth/verify-email/:token
// ============================================

router.get('/verify/:token', verifyEmail);

// ============================================
// RESEND VERIFICATION EMAIL
// POST /api/auth/resend-verification
// ============================================
router.post('/resend-verification', resendVerification);

module.exports = router;
