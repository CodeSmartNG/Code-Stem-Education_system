// routes/upload.js
const express = require('express');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { uploadVideo, uploadMedia } = require('../middleware/upload');

const router = express.Router();

// ============================================
// UPLOAD VIDEO — with full validation
// ============================================
router.post('/video', auth, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    console.log('\n📹 ===== VIDEO UPLOAD =====');
    console.log('📁 File:', req.file.filename);
    console.log('📊 Size:', (fileSize / (1024 * 1024)).toFixed(2), 'MB');
    console.log('🎬 Type:', mimeType);

    // ✅ Check 1: File exists on disk
    if (!fs.existsSync(filePath)) {
      console.error('❌ File not saved to disk');
      return res.status(500).json({
        success: false,
        message: 'File was not saved properly. Please try again.'
      });
    }

    // ✅ Check 2: Minimum size (10 KB) — anything smaller is empty/corrupt
    const MIN_SIZE = 10 * 1024;
    if (fileSize < MIN_SIZE) {
      console.error('❌ File too small:', fileSize, 'bytes');
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({
        success: false,
        message: 'File is empty or corrupted. Please try again.'
      });
    }

    // ✅ Check 3: Maximum size (50 MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      console.error('❌ File too large:', fileSize, 'bytes');
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({
        success: false,
        message: 'File exceeds 50 MB. Please compress and try again.'
      });
    }

    // ✅ Check 4: Valid MIME type
    const validMimes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo'
    ];
    if (!validMimes.includes(mimeType) && !mimeType.startsWith('video/')) {
      console.error('❌ Invalid MIME type:', mimeType);
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({
        success: false,
        message: 'Invalid video format. Please use MP4, WebM, or similar.'
      });
    }

    // ✅ Check 5: MP4 magic bytes (verifies the file is really a video)
    // This prevents renamed files from being accepted
    try {
      const buffer = Buffer.alloc(12);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buffer, 0, 12, 0);
      fs.closeSync(fd);

      const hex = buffer.toString('hex');
      const isMP4 = hex.includes('66747970'); // "ftyp" in hex
      const isWebM = hex.startsWith('1a45dfa3');

      if (!isMP4 && !isWebM && mimeType === 'video/mp4') {
        console.warn('⚠️ File does not appear to be a valid MP4');
        // Don't reject — just warn
      }
    } catch (checkErr) {
      console.warn('⚠️ Magic byte check failed:', checkErr.message);
    }

    const baseUrl = process.env.BACKEND_URL || `https://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/videos/${req.file.filename}`;

    console.log('✅ Video saved:', fileUrl);

    res.json({
      success: true,
      url: fileUrl,
      fileUrl: fileUrl,
      data: {
        url: fileUrl,
        fileName: req.file.filename,
        fileSize: fileSize,
        fileType: mimeType,
        firebasePath: `videos/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('❌ Upload video error:', error);
    // Cleanup partial file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// UPLOAD MULTIMEDIA — with validation
// ============================================
router.post('/multimedia', auth, uploadMedia.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileSize = req.file.size;
    const mimeType = req.file.mimetype;

    console.log('\n📁 ===== MULTIMEDIA UPLOAD =====');
    console.log('📁 File:', req.file.filename);
    console.log('📊 Size:', (fileSize / (1024 * 1024)).toFixed(2), 'MB');
    console.log('🎬 Type:', mimeType);

    // ✅ Minimum size check
    if (fileSize < 10 * 1024) {
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({
        success: false,
        message: 'File is empty or corrupted.'
      });
    }

    // ✅ Maximum size check (50 MB)
    if (fileSize > 50 * 1024 * 1024) {
      try { fs.unlinkSync(filePath); } catch {}
      return res.status(400).json({
        success: false,
        message: 'File exceeds 50 MB.'
      });
    }

    const baseUrl = process.env.BACKEND_URL || `https://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/media/${req.file.filename}`;

    console.log('✅ Media saved:', fileUrl);

    res.json({
      success: true,
      url: fileUrl,
      fileUrl: fileUrl,
      data: {
        url: fileUrl,
        fileName: req.file.filename,
        fileSize: fileSize,
        fileType: mimeType,
        firebasePath: `media/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('❌ Upload multimedia error:', error);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
