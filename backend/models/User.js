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
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  profileImage: String,
  bio: String,
  phone: String,
  location: String,
  whatsappNumber: String,
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
    type: Map,
    of: Boolean,
    default: {}
  },
  progress: {
    type: Map,
    of: Number,
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
// COMPARE PASSWORD (with debug logs)
// ============================================

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('\n🔐 COMPARE PASSWORD:');
    console.log('   Candidate password:', JSON.stringify(candidatePassword));
    console.log('   Candidate length:', candidatePassword?.length);
    console.log('   Stored hash:', this.password);
    console.log('   Hash length:', this.password?.length);
    console.log('   Hash prefix:', this.password?.substring(0, 7));

    const result = await bcrypt.compare(candidatePassword, this.password);

    console.log('   ✅ Match result:', result);
    return result;
  } catch (error) {
    console.error('   ❌ comparePassword error:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', userSchema);