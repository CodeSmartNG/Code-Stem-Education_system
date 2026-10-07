// backend/models/Presence.js
const mongoose = require('mongoose');

const presenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  userName: String,
  role: String,
  lastSeen: { type: Date, default: Date.now, index: true },
  room: { type: String, default: 'general' },
});

module.exports = mongoose.model('Presence', presenceSchema);
