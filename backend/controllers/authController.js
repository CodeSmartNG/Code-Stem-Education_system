const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// ============================================
// REGISTER CONTROLLER
// ============================================

exports.register = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: fullName, email, password'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name: fullName,
      email,
      password,
      role: role || 'student',
      isVerified: false,
      isApproved: role === 'admin' ? true : false
    });

    const verificationToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    user.verificationToken = verificationToken;
    await user.save();

    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Verify Your Email - STEM Platform',
        html: `
          <h1>Welcome, ${fullName}!</h1>
          <p>Please click below to verify your email:</p>
          <a href="${verificationLink}">Verify Email</a>
          <p>This link expires in 24 hours.</p>
        `
      });
    } catch (emailError) {
      console.log('⚠️ Email failed to send:', emailError.message);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for verification.',
      userId: user._id,
      verificationToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during registration'
    });
  }
};

// ============================================
// LOGIN CONTROLLER — COMPLETE
// ============================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // DEBUG LOGS
    console.log('\n🔍 ========== LOGIN ATTEMPT ==========');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🔑 Password length:', password?.length);

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    console.log('👤 User found:', !!user);

    if (!user) {
      console.log('❌ No user found with this email');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('🔒 Stored hash:', user.password);
    console.log('🔒 Hash length:', user.password?.length);

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log('✅ Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check verification (skip for admin)
    if (!user.isVerified && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Check teacher approval
    if (user.role === 'teacher' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Your teacher account is pending approval'
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log('🎫 Token generated for:', user.email);
    console.log('=========================================\n');

    // Send response
    res.status(200).json({
      success: true,
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isApproved: user.isApproved || false,
        profileImage: user.profileImage || null,
        bio: user.bio || null,
        whatsappNumber: user.whatsappNumber || '',
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login'
    });
  }
};

// ============================================
// GET CURRENT USER
// ============================================

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.verificationToken;
    delete userResponse.__v;

    res.status(200).json({
      success: true,
      user: userResponse
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// ============================================
// VERIFY EMAIL
// ============================================

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now login.'
    });

  } catch (error) {
    console.error('Verify email error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// ============================================
// RESEND VERIFICATION
// ============================================

exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    user.verificationToken = verificationToken;
    await user.save();

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: email,
      subject: 'Resend: Verify Your Email - STEM Platform',
      html: `
        <h1>Verify Your Email</h1>
        <p>Click <a href="${verificationLink}">here</a> to verify your email</p>
        <p>This link expires in 24 hours.</p>
      `
    });

    res.status(200).json({
      success: true,
      message: 'Verification email resent successfully'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};