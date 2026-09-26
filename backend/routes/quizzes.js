// backend/routes/quizzes.js
const express = require('express');
const router = express.Router();
const { auth, isTeacher } = require('../middleware/auth');

// CREATE quiz
router.post('/', [auth, isTeacher], async (req, res) => {
  try {
    console.log('📝 CREATE QUIZ:', req.body);

    const { lessonId, title, passingScore, questions } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'lessonId is required'
      });
    }

    const quiz = {
      _id: Date.now().toString(),
      lessonId,
      title: title || 'Lesson Quiz',
      passingScore: passingScore || 70,
      questions: questions || [],
      createdAt: new Date().toISOString()
    };

    console.log('✅ Quiz created:', quiz._id);

    res.status(201).json({
      success: true,
      message: 'Quiz created',
      quiz: quiz,
      data: quiz
    });
  } catch (error) {
    console.error('❌ Create quiz error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;