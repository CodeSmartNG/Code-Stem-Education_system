// routes/courses.js

const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, isTeacher, isAdmin } = require('../middleware/auth');
const Course = require('../models/Course');
const User = require('../models/User');
const Lesson = require('../models/Lesson');

const router = express.Router();

// ✅ Create course (teacher only)
router.post('/', [
  auth,
  isTeacher,
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, thumbnail } = req.body;

    const course = new Course({
      title,
      description,
      thumbnail: thumbnail || '📚',
      teacherId: req.user._id,
      teacherName: req.user.name,
      isPublished: false
    });

    await course.save();

    // Add course to teacher's courses
    await User.findByIdAndUpdate(req.user._id, {
      $push: { courses: course._id }
    });

    res.status(201).json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ Get all courses (published only for students)
router.get('/', auth, async (req, res) => {
  try {
    const query = { isPublished: true };
    
    // Teachers and admins see all courses
    if (req.user.role === 'teacher' || req.user.role === 'admin') {
      query.isPublished = { $ne: false };
    }

    const courses = await Course.find(query)
      .populate('teacherId', 'name email whatsappNumber')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ Get course by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('teacherId', 'name email whatsappNumber')
      .populate('lessonIds');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user can access this course
    if (!course.isPublished && req.user.role !== 'admin' && 
        req.user.role !== 'teacher' && course.teacherId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Course not published.'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ Update course
router.put('/:id', [auth, isTeacher], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user owns this course
    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this course.'
      });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ Delete course
router.delete('/:id', [auth, isTeacher], async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this course.'
      });
    }

    // Delete all lessons
    await Lesson.deleteMany({ courseId: course._id });
    
    // Delete course
    await course.deleteOne();

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ Publish/Unpublish course
router.patch('/:id/publish', [auth, isTeacher], async (req, res) => {
  try {
    const { isPublished } = req.body;
    
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (course.teacherId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this course.'
      });
    }

    course.isPublished = isPublished;
    course.updatedAt = Date.now();
    await course.save();

    res.json({
      success: true,
      data: course,
      message: isPublished ? 'Course published successfully' : 'Course unpublished successfully'
    });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
