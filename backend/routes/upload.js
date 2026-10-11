// routes/upload.js
const express = require('express');
const { auth } = require('../middleware/auth');
const { uploadVideo, uploadMedia } = require('../middleware/upload');

const router = express.Router();

// ============================================
// UPLOAD VIDEO
// ============================================
router.post('/video', auth, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // ✅ With CloudinaryStorage, req.file.path is the full CDN URL
    const fileUrl = req.file.path || req.file.secure_url;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    const publicId = req.file.filename || req.file.public_id;

    console.log('\n📹 ===== VIDEO UPLOAD =====');
    console.log('📁 Public ID:', publicId);
    console.log('🔗 URL:', fileUrl);
    console.log('📊 Size:', (fileSize / (1024 * 1024)).toFixed(2), 'MB');
    console.log('🎬 Type:', mimeType);

    if (fileSize < 10 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File is empty or corrupted. Please try again.',
      });
    }
    if (fileSize > 50 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File exceeds 50 MB. Please compress and try again.',
      });
    }
    if (!fileUrl) {
      return res.status(500).json({
        success: false,
        message: 'Upload succeeded but no URL returned',
      });
    }

    console.log('✅ Video uploaded to Cloudinary');

    return res.json({
      success: true,
      url: fileUrl,
      fileUrl: fileUrl,
      data: {
        url: fileUrl,
        fileName: publicId,
        fileSize,
        fileType: mimeType,
        publicId,
        firebasePath: `videos/${publicId}`, // kept for backward-compat
      },
    });
  } catch (error) {
    console.error('❌ Upload video error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// UPLOAD MULTIMEDIA
// ============================================
router.post('/multimedia', auth, uploadMedia.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = req.file.path || req.file.secure_url;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;
    const publicId = req.file.filename || req.file.public_id;

    console.log('\n📁 ===== MULTIMEDIA UPLOAD =====');
    console.log('📁 Public ID:', publicId);
    console.log('🔗 URL:', fileUrl);
    console.log('📊 Size:', (fileSize / (1024 * 1024)).toFixed(2), 'MB');
    console.log('🎬 Type:', mimeType);

    if (fileSize < 10 * 1024) {
      return res.status(400).json({ success: false, message: 'File is empty or corrupted.' });
    }
    if (fileSize > 50 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File exceeds 50 MB.' });
    }
    if (!fileUrl) {
      return res.status(500).json({ success: false, message: 'Upload succeeded but no URL returned' });
    }

    console.log('✅ Media uploaded to Cloudinary');

    return res.json({
      success: true,
      url: fileUrl,
      fileUrl: fileUrl,
      data: {
        url: fileUrl,
        fileName: publicId,
        fileSize,
        fileType: mimeType,
        publicId,
        firebasePath: `media/${publicId}`,
      },
    });
  } catch (error) {
    console.error('❌ Upload multimedia error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
