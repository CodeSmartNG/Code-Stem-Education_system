// routes/courses.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, isTeacher, isAdmin } = require('../middleware/auth');
const Course = require('../models/Course');
const User = require('../models/User');
const Lesson = require('../models/Lesson');

// ✅ Make sure Quiz + Multimedia models are registered so populate doesn't crash
require('../models/Quiz');
require('../models/Multimedia');

const router = express.Router();

// ============================================
// CREATE COURSE (teacher only)
// POST /api/courses
// ============================================
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

// ============================================
// HELPER — Safe populate with fallback
// ============================================
const fetchCoursesWithFallback = async (query) => {
  try {
    // ✅ Try full nested populate first
    return await Course.find(query)
      .populate('teacherId', 'name email whatsappNumber')
      .populate({
        path: 'lessonIds',
        populate: [
          { path: 'quizId' },
          { path: 'multimediaIds' }
        ]
      })
      .sort({ createdAt: -1 });
  } catch (populateError) {
    console.error('⚠️ Nested populate failed:', populateError.message);
    console.error('⚠️ Retrying WITHOUT nested populate...');

    // ✅ Fallback — populate lessons only, no nested
    return await Course.find(query)
      .populate('teacherId', 'name email whatsappNumber')
      .populate('lessonIds')
      .sort({ createdAt: -1 });
  }
};

// ============================================
// HELPER — Normalize course + lessons
// ============================================
const normalizeCourse = (course) => {
  const obj = course.toObject();
  obj.id = obj._id.toString();
  obj._id = obj._id.toString();

  if (Array.isArray(obj.lessonIds)) {
    obj.lessons = obj.lessonIds
      // ✅ Drop any lessons that failed to populate (became null)
      .filter((lesson) => lesson && typeof lesson === 'object')
      .map((lesson) => {
        const lessonObj = {
          ...lesson,
          id: lesson._id ? lesson._id.toString() : lesson.id,
          _id: lesson._id ? lesson._id.toString() : lesson._id
        };

        // ✅ Alias — only if populated as an object
        lessonObj.quiz =
          lesson.quizId && typeof lesson.quizId === 'object'
            ? lesson.quizId
            : null;

        if (Array.isArray(lesson.multimediaIds)) {
          lessonObj.multimedia = lesson.multimediaIds;
        }

        return lessonObj;
      });
  } else {
    obj.lessons = [];
  }

  return obj;
};

// ============================================
// GET ALL COURSES
// GET /api/courses
// ============================================
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      query.isPublished = true;
    } else if (req.user.role === 'teacher') {
      query.teacherId = req.user._id;
    }

    console.log('\n🔍 ===== GET /courses =====');
    console.log('👤 Role:', req.user.role);
    console.log('📋 Query:', JSON.stringify(query));

    const courses = await fetchCoursesWithFallback(query);

    console.log('✅ Courses found:', courses.length);
    console.log('=========================\n');

    const normalizedCourses = courses.map(normalizeCourse);

    return res.json({
      success: true,
      count: normalizedCourses.length,
      courses: normalizedCourses,
      data: normalizedCourses
    });
  } catch (error) {
    console.error('❌ Get courses error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET SINGLE COURSE
// GET /api/courses/:id
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    let course;

    try {
      course = await Course.findById(req.params.id)
        .populate('teacherId', 'name email whatsappNumber')
        .populate({
          path: 'lessonIds',
          populate: [
            { path: 'quizId' },
            { path: 'multimediaIds' }
          ]
        });
    } catch (populateError) {
      console.error('⚠️ Nested populate failed for single course:', populateError.message);
      course = await Course.findById(req.params.id)
        .populate('teacherId', 'name email whatsappNumber')
        .populate('lessonIds');
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Auto-enroll student on first access
    if (req.user.role === 'student') {
      const alreadyEnrolled = course.enrolledStudentIds?.some(
        (id) => id.toString() === req.user._id.toString()
      );

      if (!alreadyEnrolled) {
        course.enrolledStudentIds = course.enrolledStudentIds || [];
        course.enrolledStudentIds.push(req.user._id);
        course.enrolledStudents = (course.enrolledStudents || 0) + 1;
        await course.save();
        console.log('✅ Student auto-enrolled:', req.user._id);
      }
    }

    const courseObj = normalizeCourse(course);

    res.json({
      success: true,
      data: courseObj
    });
  } catch (error) {
    console.error('❌ Get course error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// UPDATE COURSE
// PUT /api/courses/:id
// ============================================
router.put('/:id', [auth, isTeacher], async (req, res) => {
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

// ============================================
// DELETE COURSE
// DELETE /api/courses/:id
// ============================================
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

    await Lesson.deleteMany({ courseId: course._id });
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

// ============================================
// PUBLISH / UNPUBLISH
// PATCH /api/courses/:id/publish
// ============================================
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
      message: isPublished
        ? 'Course published successfully'
        : 'Course unpublished successfully'
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
