// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// ✅ Register all models at startup so populate() works
require('./models/User');
require('./models/Course');
require('./models/Lesson');
require('./models/Quiz');
require('./models/Multimedia');

// Import database connection
const connectDB = require('./config/database');

// ✅ Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const lessonRoutes = require('./routes/lessons');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const multimediaRoutes = require('./routes/multimedia');
const quizRoutes = require('./routes/quizzes');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

// ✅ Initialize express app FIRST
const app = express();

// ✅ Connect to database
connectDB().catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
});

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://code-stem-education-system-i5dv.vercel.app',
    'https://code-stem-education-system-one.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));

// ✅ CRITICAL: Webhook MUST come before express.json() — needs raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ============================================
// ✅ STATIC FILES — with correct MIME types
// ============================================
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.mp4') {
        res.setHeader('Content-Type', 'video/mp4');
      } else if (ext === '.webm') {
        res.setHeader('Content-Type', 'video/webm');
      } else if (ext === '.ogg' || ext === '.ogv') {
        res.setHeader('Content-Type', 'video/ogg');
      } else if (ext === '.mov') {
        res.setHeader('Content-Type', 'video/quicktime');
      } else if (ext === '.mkv') {
        res.setHeader('Content-Type', 'video/x-matroska');
      } else if (ext === '.mp3') {
        res.setHeader('Content-Type', 'audio/mpeg');
      } else if (ext === '.wav') {
        res.setHeader('Content-Type', 'audio/wav');
      } else if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      } else if (ext === '.png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (ext === '.gif') {
        res.setHeader('Content-Type', 'image/gif');
      } else if (ext === '.webp') {
        res.setHeader('Content-Type', 'image/webp');
      }

      // ✅ Allow video/audio seeking
      res.setHeader('Accept-Ranges', 'bytes');

      // ✅ Allow embedding (helmet might block)
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// ============================================
// ROOT & HEALTH ROUTES
// ============================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'STEM Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      courses: '/api/courses',
      lessons: '/api/lessons',
      users: '/api/users',
      upload: '/api/upload',
      multimedia: '/api/multimedia',
      quizzes: '/api/quizzes',
      notifications: '/api/notifications',
      payments: '/api/payments'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ============================================
// ✅ API ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/multimedia', multimediaRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

// ============================================
// ✅ DEBUG: List all registered routes
// ============================================
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  const extractRoutes = (stack, basePath = '') => {
    stack.forEach(middleware => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
        routes.push(`${methods} ${basePath}${middleware.route.path}`);
      } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
        const regexp = middleware.regexp.source
          .replace('^\\/?(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\\\?/g, '')
          .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
        const newBase = basePath + regexp.replace(/\/\?$/, '').replace(/\$$/, '');
        extractRoutes(middleware.handle.stack, newBase);
      }
    });
  };
  extractRoutes(app._router.stack);
  res.json({
    count: routes.length,
    routes: routes.sort()
  });
});

// ============================================
// 404 & ERROR HANDLERS
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

// ============================================
// ✅ START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('===========================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('✅ CORS enabled for:');
  console.log('   - http://localhost:5173');
  console.log('   - http://localhost:3000');
  console.log('   - http://127.0.0.1:5173');
  console.log('   - https://code-stem-education-system-i5dv.vercel.app');
  console.log('   - https://code-stem-education-system-one.vercel.app');
  console.log(`✅ MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log('===========================================');
});
