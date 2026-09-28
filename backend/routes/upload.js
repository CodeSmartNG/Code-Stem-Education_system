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

    // ✅ Force HTTPS — required for Vercel (mixed content blocking)
    const baseUrl = process.env.BACKEND_URL || `https://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/videos/${req.file.filename}`;

    console.log('✅ Video uploaded:', fileUrl);

    res.json({
      success: true,
      url: fileUrl,                    // ✅ Also top-level
      fileUrl: fileUrl,                // ✅ Backup key
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

    const baseUrl = process.env.BACKEND_URL || `https://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/media/${req.file.filename}`;

    console.log('✅ Media uploaded:', fileUrl);

    res.json({
      success: true,
      url: fileUrl,
      fileUrl: fileUrl,
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
