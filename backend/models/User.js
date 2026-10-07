// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  verificationToken: String,
  profileImage: String,
  bio: String,
  phone: String,
  location: String,
  whatsappNumber: String,

  // ✅ Wallet — used for teacher earnings
  wallet: {
    balance: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    pendingWithdrawals: { type: Number, default: 0 },
    paidOut: { type: Number, default: 0 },
    transactions: [{
      type: { type: String, enum: ['credit', 'debit', 'withdrawal'], default: 'credit' },
      amount: { type: Number, default: 0 },
      description: { type: String, default: '' },
      reference: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    }]
  },

  level: {
    type: String,
    default: 'Beginner'
  },
  purchasedLessons: [{
    courseKey: String,
    lessonId: String,
    purchasedAt: Date
  }],
  completedLessons: {
    type: [String],
    default: []
  },
  progress: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ============================================
// HASH PASSWORD BEFORE SAVING
// ============================================
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ============================================
// COMPARE PASSWORD
// ============================================
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);
