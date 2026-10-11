// middleware/upload.js
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ============================================
// CLOUDINARY CONFIG
// ============================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

if (
  !process.env.CLOUDINARY_CLOUD_NAME ||
  !process.env.CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET
) {
  console.error(
    '❌ Cloudinary env vars missing! Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET'
  );
}

// ============================================
// VIDEO STORAGE
// ============================================
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'codesmart/videos',
    resource_type: 'video',                                  // ✅ critical for videos
    allowed_formats: ['mp4', 'webm', 'ogg', 'mov', 'avi'],
    public_id: `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }),
});

// ============================================
// MEDIA STORAGE — images, audio, docs, video
// ============================================
const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    const isAudio = file.mimetype.startsWith('audio/');
    const isVideo = file.mimetype.startsWith('video/');

    // Cloudinary resource_type mapping:
    //  - image  → images
    //  - video  → videos AND audio
    //  - raw    → pdf, docx, txt, etc.
    let resourceType = 'raw';
    if (isImage) resourceType = 'image';
    else if (isVideo || isAudio) resourceType = 'video';

    return {
      folder: 'codesmart/media',
      resource_type: resourceType,
      public_id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
});

// ============================================
// FILE FILTERS (still useful — reject before upload)
// ============================================
const videoFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
  ];

  if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only video files are allowed.'), false);
  }
};

const mediaFilter = (req, file, cb) => {
  const allowedTypes = [
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'audio/mpeg', 'audio/ogg', 'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  if (
    allowedTypes.includes(file.mimetype) ||
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

// ============================================
// MULTER INSTANCES
// ============================================
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: videoFilter,
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: mediaFilter,
});

module.exports = { uploadVideo, uploadMedia, cloudinary };
