// middleware/upload.js
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Video upload configuration
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos');
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Multimedia upload configuration
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/media');
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for videos
const videoFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4', 'video/webm', 'video/ogg',
    'video/quicktime', 'video/x-msvideo'
  ];

  if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

// ✅ File filter for multimedia — NOW INCLUDES VIDEO
const mediaFilter = (req, file, cb) => {
  const allowedTypes = {
    video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]
  };

  const allAllowed = [
    ...allowedTypes.video,
    ...allowedTypes.image,
    ...allowedTypes.audio,
    ...allowedTypes.document
  ];

  if (
    allAllowed.includes(file.mimetype) ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('audio/')
  ) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only videos, images, audio, and documents are allowed.'),
      false
    );
  }
};

// ✅ Upload instances — videos now capped at 50 MB
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB (matches frontend)
  },
  fileFilter: videoFilter
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB
  },
  fileFilter: mediaFilter
});

module.exports = { uploadVideo, uploadMedia };
