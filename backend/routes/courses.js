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
// ✅ Get all courses (published only for students)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      query.isPublished = true;
    } else if (req.user.role === 'teacher') {
      query.teacherId = req.user._id;
    }
    // Admins see ALL courses

    console.log('\n🔍 ===== GET /courses =====');
    console.log('👤 Role:', req.user.role);
    console.log('👤 User _id:', req.user._id);
    console.log('📋 Query:', JSON.stringify(query));

    const courses = await Course.find(query)
      .populate('teacherId', 'name email whatsappNumber')
      .populate('lessonIds')
      .sort({ createdAt: -1 });

    console.log('✅ Courses found:', courses.length);
    console.log('📚 Titles:', courses.map(c => c.title));
    console.log('=========================\n');

    // ✅ Normalize and send — ONLY ONE res.json()
    const normalizedCourses = courses.map(course => {
      const obj = course.toObject();
      obj.id = obj._id.toString();
      obj._id = obj._id.toString();

      // Populate lessons from lessonIds
      if (obj.lessonIds && Array.isArray(obj.lessonIds)) {
        obj.lessons = obj.lessonIds.map(lesson => ({
          ...lesson,
          id: lesson._id ? lesson._id.toString() : lesson.id,
          _id: lesson._id ? lesson._id.toString() : lesson._id
        }));
      } else {
        obj.lessons = [];
      }

      return obj;
    });

    return res.json({
      success: true,
      count: normalizedCourses.length,
      courses: normalizedCourses,
      data: normalizedCourses
    });

  } catch (error) {
    console.error('Get courses error:', error);
    return res.status(500).json({
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

    // ✅ Auto-enroll student on first access
    if (req.user.role === 'student') {
      // Check if already enrolled
      const alreadyEnrolled = course.enrolledStudentIds?.some(
        id => id.toString() === req.user._id.toString()
      );

      if (!alreadyEnrolled) {
        course.enrolledStudentIds = course.enrolledStudentIds || [];
        course.enrolledStudentIds.push(req.user._id);
        course.enrolledStudents = (course.enrolledStudents || 0) + 1;
        await course.save();
        console.log('✅ Student auto-enrolled:', req.user._id);
      }
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
