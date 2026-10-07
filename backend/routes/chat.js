// backend/routes/chat.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Message = require('../models/Message');
const Presence = require('../models/Presence');
const { auth } = require('../middleware/auth');

// ============================================
// SEND a message
// POST /api/chat/messages
// ============================================
router.post('/messages', auth, async (req, res) => {
  try {
    const { text, room = 'general', replyTo } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const user = req.user;

    const message = await Message.create({
      sender: user._id,
      senderName: user.name || 'User',
      senderRole: user.role || 'student',
      room,
      text: text.trim(),
      replyTo: replyTo || null,
    });

    // Update sender's presence
    await Presence.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        userName: user.name || 'User',
        role: user.role || 'student',
        lastSeen: new Date(),
        room,
      },
      { upsert: true }
    );

    return res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// FETCH new messages since a timestamp
// GET /api/chat/messages?room=general&since=2026-10-08T10:00:00Z
// ============================================
router.get('/messages', auth, async (req, res) => {
  try {
    const { room = 'general', since } = req.query;

    const query = { room, deleted: false };

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        query.createdAt = { $gt: sinceDate };
      }
    }

    const messages = await Message.find(query)
      .populate('replyTo', 'senderName text createdAt')
      .sort({ createdAt: 1 })
      .limit(200);

    // Update user's presence whenever they fetch
    await Presence.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        userName: req.user.name || 'User',
        role: req.user.role || 'student',
        lastSeen: new Date(),
        room,
      },
      { upsert: true }
    );

    return res.json({ success: true, messages });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// DELETE a message (sender, teacher, or admin)
// DELETE /api/chat/messages/:id
// ============================================
router.delete('/messages/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid message ID' });
    }

    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const isSender = message.sender.toString() === req.user._id.toString();
    const isTeacher = req.user.role === 'teacher';
    const isAdmin = req.user.role === 'admin';

    if (!isSender && !isTeacher && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this message' });
    }

    message.deleted = true;
    message.text = '[deleted]';
    await message.save();

    return res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// HEARTBEAT — mark user as online
// POST /api/chat/heartbeat
// ============================================
router.post('/heartbeat', auth, async (req, res) => {
  try {
    await Presence.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        userName: req.user.name || 'User',
        role: req.user.role || 'student',
        lastSeen: new Date(),
      },
      { upsert: true }
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// GET online users (last seen within 60 seconds)
// GET /api/chat/online-users
// ============================================
router.get('/online-users', auth, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 60 * 1000);

    const users = await Presence.find({ lastSeen: { $gt: cutoff } })
      .select('userId userName role lastSeen')
      .sort({ lastSeen: -1 })
      .limit(50);

    return res.json({ success: true, users });
  } catch (error) {
    console.error('Online users error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
