// backend/models/AIMessage.js
const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: [8000, 'Message too long'],
    },
  },
  { timestamps: true }
);

// Compound index: fast per-user chronological lookup
aiMessageSchema.index({ userId: 1, createdAt: 1 });

module.exports = mongoose.model('AIMessage', aiMessageSchema);
