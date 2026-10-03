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

  // ✅ Alias quizId → quiz for frontend compatibility
  const normalized = {
    ...obj,
    id: id,
    _id: id,
    quiz: obj.quizId || null,
    multimedia: obj.multimediaIds || []
  };

  return normalized;
};

// ============================================
// GET all lessons (optionally by course)
// GET /api/lessons?courseId=xxx
// ============================================
router.get('/', auth, async (req, res) => {
  try {
    const { courseId } = req.query;
    const query = courseId ? { courseId } : {};

    const lessons = await Lesson.find(query)
      .populate('quizId')          // ✅ Populate quiz
      .populate('multimediaIds')   // ✅ Populate multimedia
      .sort({ order: 1 });

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lesson ID format'
      });
    }

    const lesson = await Lesson.findById(req.params.id)
      .populate('quizId')          // ✅ Populate quiz
      .populate('multimediaIds');  // ✅ Populate multimedia

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

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

    // ✅ Use a local variable for the sanitized isFree value
    const lessonIsFree = isFree !== undefined ? isFree : true;

    const lesson = await Lesson.create({
      title,
      content: content || '',
      duration: duration || '',
      isFree: lessonIsFree,
      price: lessonIsFree ? 0 : (price || 0),
      order: order || 0,
      courseId: courseId,
      createdAt: new Date()
    });

    console.log('✅ Lesson created:', lesson._id);

    await Course.findByIdAndUpdate(courseId, {
      $push: { lessonIds: lesson._id }
    });

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lesson ID format'
      });
    }

    const lesson = await Lesson.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('quizId')
      .populate('multimediaIds');

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

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




// ============================================
// CREATE/ATTACH QUIZ to a lesson
// POST /api/lessons/:id/quiz
// ============================================
router.post('/:id/quiz', [auth, isTeacher], async (req, res) => {
  try {
    console.log('\n📝 ===== ATTACH QUIZ =====');
    console.log('👤 Teacher:', req.user?._id);
    console.log('📥 Lesson ID:', req.params.id);
    console.log('📥 Quiz payload:', JSON.stringify(req.body, null, 2));

    // ✅ Validate lesson ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lesson ID format'
      });
    }

    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found'
      });
    }

    // ✅ Validate quiz payload
    const { title, passingScore, questions } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quiz must have at least one question'
      });
    }

    // ✅ Create the Quiz document
    const Quiz = require('../models/Quiz');
    const quiz = await Quiz.create({
      lessonId: lesson._id,
      courseId: lesson.courseId,
      title: title || 'Lesson Quiz',
      passingScore: passingScore || 70,
      questions: questions
    });

    console.log('✅ Quiz created:', quiz._id);

    // ✅ Attach quiz to lesson
    lesson.quizId = quiz._id;
    lesson.updatedAt = new Date();
    await lesson.save();

    console.log('✅ Quiz attached to lesson:', lesson._id);

    return res.status(201).json({
      success: true,
      message: 'Quiz attached to lesson successfully',
      quiz: quiz,
      data: quiz
    });

  } catch (error) {
    console.error('❌ Attach quiz error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
module.exports = router;