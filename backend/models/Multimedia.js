// models/Multimedia.js

const mongoose = require('mongoose');

const MultimediaSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['video', 'image', 'audio', 'document'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  fileType: {
    type: String,
    default: ''
  },
  firebasePath: {
    type: String,
    default: ''
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Multimedia', MultimediaSchema);
