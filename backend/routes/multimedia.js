// backend/routes/multimedia.js
const express = require('express');
const router = express.Router();
const Multimedia = require('../models/Multimedia');
const { auth, isTeacher } = require('../middleware/auth');

// GET multimedia by lesson
router.get('/lesson/:lessonId', auth, async (req, res) => {
  try {
    const multimedia = await Multimedia.find({ lessonId: req.params.lessonId });
    res.json({
      success: true,
      count: multimedia.length,
      data: multimedia,
      multimedia: multimedia
    });
  } catch (error) {
    console.error('Get multimedia error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// CREATE multimedia
router.post('/', [auth, isTeacher], async (req, res) => {
  try {
    console.log('📤 CREATE MULTIMEDIA:', req.body);

    const { type, url, title, description, fileName, fileSize, fileType, firebasePath, lessonId } = req.body;

    if (!lessonId) {
      return res.status(400).json({
        success: false,
        message: 'lessonId is required'
      });
    }

    const multimedia = await Multimedia.create({
      type: type || 'video',
      url: url || '',
      title: title || 'Untitled',
      description: description || '',
      fileName: fileName || '',
      fileSize: fileSize || 0,
      fileType: fileType || '',
      firebasePath: firebasePath || '',
      lessonId: lessonId
    });

    console.log('✅ Multimedia created:', multimedia._id);

    res.status(201).json({
      success: true,
      message: 'Multimedia added',
      data: multimedia,
      multimedia: multimedia
    });
  } catch (error) {
    console.error('❌ Create multimedia error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE multimedia
router.delete('/:id', [auth, isTeacher], async (req, res) => {
  try {
    const multimedia = await Multimedia.findByIdAndDelete(req.params.id);
    if (!multimedia) {
      return res.status(404).json({ success: false, message: 'Multimedia not found' });
    }
    res.json({ success: true, message: 'Multimedia deleted' });
  } catch (error) {
    console.error('Delete multimedia error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;