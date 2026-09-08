// models/Quiz.js

const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  passingScore: {
    type: Number,
    required: true,
    default: 70,
    min: 0,
    max: 100
  },
  questions: [{
    id: {
      type: Number,
      required: true
    },
    question: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'image'],
      default: 'text'
    },
    imageUrl: {
      type: String,
      default: ''
    },
    options: {
      type: [String],
      required: true,
      validate: [array => array.length >= 2, 'At least 2 options required']
    },
    correctAnswer: {
      type: Number,
      required: true
    }
  }],
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

module.exports = mongoose.model('Quiz', QuizSchema);
