// models/Course.js

const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a course title'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a course description'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters']
  },
  thumbnail: {
    type: String,
    default: '📚'
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  lessonIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson'
  }],
  enrolledStudents: {
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for lessons count
CourseSchema.virtual('lessonsCount').get(function() {
  return this.lessonIds?.length || 0;
});

// Virtual for enrolled students count
CourseSchema.virtual('studentsCount').get(function() {
  return this.enrolledStudents || 0;
});

module.exports = mongoose.model('Course', CourseSchema);
