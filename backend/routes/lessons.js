// backend/routes/lessons.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { auth, isTeacher } = require('../middleware/auth');

// ============================================
// HELPER — normalize lesson objects
// ============================================
const normalizeLesson = (lesson) => {
  const obj = lesson.toObject ? lesson.toObject() : lesson;
  const id = obj._id ? obj._id.toString() : obj.id;
  return {
    ...obj,
    id: id,
    _id: id
  };
};

// ============================================
// GET all lessons (optionally by course)
// GET /api/lessons?courseId=xxx
// ============================================
router.get('/', auth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const query = courseId ? { courseId } : {};

    const lessons = await Lesson.find(query).sort({ order: 1 });

    // ✅ Normalize every lesson to have 'id'
    const normalizedLessons = lessons.map(normalizeLesson);

    res.json({
      success: true,
      count: normalizedLessons.length,
      lessons: normalizedLessons,
      data: normalizedLessons
    });
  } catch (error) {
    console.error('Get lessons error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET single lesson by ID
// GET /api/lessons/:id
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // ✅ Normalize
    const normalized = normalizeLesson(lesson);

    res.json({
      success: true,
      lesson: normalized,
      data: normalized
    });
  } catch (error) {
    console.error('Get lesson error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// CREATE lesson
// POST /api/lessons
// ============================================
router.post('/', [auth, isTeacher], async (req, res) => {
  try {
    const { title, content, duration, isFree, price, order, courseId } = req.body;

    console.log('\n📝 ===== CREATE LESSON =====');
    console.log('👤 Teacher:', req.user?._id);
    console.log('📥 Body:', req.body);

    if (!title || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Title and courseId are required'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const lesson = await Lesson.create({
      title,
      content: content || '',
      duration: duration || '',
      isFree: isFree !== undefined ? isFree : true,
      price: isFree ? 0 : (price || 0),
      order: order || 0,
      courseId: courseId,
      createdAt: new Date()
    });

    console.log('✅ Lesson created:', lesson._id);

    await Course.findByIdAndUpdate(courseId, {
      $push: { lessonIds: lesson._id }
    });

    // ✅ Normalize the response
    const normalized = normalizeLesson(lesson);

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      lesson: normalized,
      data: normalized,
      lessonId: normalized.id
    });

  } catch (error) {
    console.error('❌ Create lesson error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// UPDATE lesson
// PUT /api/lessons/:id
// ============================================
router.put('/:id', [auth, isTeacher], async (req, res) => {
  try {
    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // ✅ Normalize
    const normalized = normalizeLesson(lesson);

    res.json({
      success: true,
      lesson: normalized,
      data: normalized
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// DELETE lesson
// DELETE /api/lessons/:id
// ============================================
router.delete('/:id', [auth, isTeacher], async (req, res) => {
  try {
    console.log('🗑️ Delete lesson request:', req.params.id);

    // ✅ Validate ObjectId
    if (!req.params.id || req.params.id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lesson ID'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lesson ID format'
      });
    }

    const lesson = await Lesson.findByIdAndDelete(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    if (lesson.courseId) {
      await Course.findByIdAndUpdate(lesson.courseId, {
        $pull: { lessonIds: lesson._id }
      });
    }

    console.log('✅ Lesson deleted:', req.params.id);

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
