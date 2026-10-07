// backend/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  senderName: { type: String, required: true },
  senderRole: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true,
  },
  room: {
    type: String,
    default: 'general',
    index: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Message too long (max 1000 chars)'],
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null,
  },
  deleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Message', messageSchema);
