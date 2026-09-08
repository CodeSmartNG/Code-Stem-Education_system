// models/Lesson.js

const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a lesson title'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters']
  },
  content: {
    type: String,
    required: [true, 'Please provide lesson content'],
    trim: true
  },
  duration: {
    type: String,
    required: [true, 'Please provide lesson duration']
  },
  order: {
    type: Number,
    default: 0
  },
  isFree: {
    type: Boolean,
    default: true
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  multimediaIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Multimedia'
  }],
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    default: null
  },
  purchaseCount: {
    type: Number,
    default: 0
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

module.exports = mongoose.model('Lesson', LessonSchema);
