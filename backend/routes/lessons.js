// backend/routes/lessons.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { auth, isTeacher } = require('../middleware/auth');

// ============================================
// GET all lessons (optionally by course)
// GET /api/lessons?courseId=xxx
// ============================================
router.get('/', auth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const query = courseId ? { courseId } : {};

    const lessons = await Lesson.find(query).sort({ order: 1 });

    res.json({
      success: true,
      count: lessons.length,
      lessons: lessons,
      data: lessons
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

    res.json({
      success: true,
      lesson: lesson,
      data: lesson
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

    // ✅ Validate
    if (!title || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Title and courseId are required'
      });
    }

    // ✅ Check course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // ✅ Create lesson
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

    // ✅ Add lesson to course
    await Course.findByIdAndUpdate(courseId, {
      $push: { lessonIds: lesson._id }
    });

    // ✅ Return with all possible keys
    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      lesson: lesson,
      data: lesson,
      lessonId: lesson._id
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

    res.json({
      success: true,
      lesson: lesson,
      data: lesson
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
    const lesson = await Lesson.findByIdAndDelete(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // Remove lesson from course
    if (lesson.courseId) {
      await Course.findByIdAndUpdate(lesson.courseId, {
        $pull: { lessonIds: lesson._id }
      });
    }

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
