// routes/upload.js

const express = require('express');
const { auth } = require('../middleware/auth');
const { uploadVideo, uploadMedia } = require('../middleware/upload');

const router = express.Router();

// ✅ Upload video
router.post('/video', auth, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        fileName: req.file.filename,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        firebasePath: `videos/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ✅ Upload multimedia
router.post('/multimedia', auth, uploadMedia.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/media/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        fileName: req.file.filename,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        firebasePath: `media/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Upload multimedia error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
