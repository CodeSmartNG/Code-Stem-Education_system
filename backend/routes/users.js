// backend/routes/users.js
const express = require('express');
const { auth, isAdmin } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();


// ============================================
// APPROVE TEACHER (Admin only)
// ============================================
router.patch('/:id/approve', [auth, isAdmin], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: true,
        approvedDate: new Date(),
        status: 'approved',
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).select('-password -verificationToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('✅ Teacher approved:', user.email);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Approve teacher error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// REJECT TEACHER (Admin only)
// ============================================
router.patch('/:id/reject', [auth, isAdmin], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: false,
        status: 'rejected',
        rejectedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).select('-password -verificationToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('❌ Teacher rejected:', user.email);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Reject teacher error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// DISMISS TEACHER (Admin only)
// ============================================
router.patch('/:id/dismiss', [auth, isAdmin], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isApproved: false,
        status: 'dismissed',
        dismissedAt: new Date(),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).select('-password -verificationToken');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log('🚫 Teacher dismissed:', user.email);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Dismiss teacher error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ============================================
// GET ALL USERS (Admin only)
// ============================================
router.get('/', auth, async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    
    const users = await User.find(query).select('-password -verificationToken');
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET SINGLE USER
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -verificationToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// UPDATE USER
// ============================================
router.put('/:id', auth, async (req, res) => {
  try {
    // Only admin or self can update
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own profile.'
      });
    }

    // Don't allow role change unless admin
    if (req.body.role && req.user.role !== 'admin') {
      delete req.body.role;
    }

    // Don't allow password update via this route
    if (req.body.password) {
      delete req.body.password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password -verificationToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// DELETE USER (Admin only)
// ============================================
router.delete('/:id', [auth, isAdmin], async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
