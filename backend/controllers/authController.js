const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// ============================================
// REGISTER CONTROLLER
// ============================================





exports.register = async (req, res) => {
  try {
    // ✅ DEBUG — Show what arrived
    console.log('\n========== REGISTER ATTEMPT ==========');
    console.log('📥 Body received:', JSON.stringify(req.body, null, 2));
    console.log('   fullName:', req.body?.fullName);
    console.log('   name:', req.body?.name);
    console.log('   email:', req.body?.email);
    console.log('   password present:', !!req.body?.password);
    console.log('   password length:', req.body?.password?.length);
    console.log('======================================\n');

    const { fullName, name, email, password, role } = req.body;
    const userName = fullName || name;   // ← accepts both

    if (!userName || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ Email already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({
      name: userName,   // ← uses whichever was provided
      email,
      password,
      role: role || 'student',
      isVerified: false,
      isApproved: role === 'admin' ? true : false
    });

    console.log('✅ User created:', user.email);






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
// LOGIN CONTROLLER — WITH FULL DEBUG
// ============================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n============================================');
    console.log('🔍 LOGIN ATTEMPT');
    console.log('============================================');
    console.log('📧 Email received:', JSON.stringify(email));
    console.log('📧 Email length:', email?.length);
    console.log('🔑 Password received:', JSON.stringify(password));
    console.log('🔑 Password length:', password?.length);

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    console.log('👤 User found:', !!user);

    if (!user) {
      console.log('❌ No user found with email:', email);
      console.log('============================================\n');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('👤 User name:', user.name);
    console.log('👤 User role:', user.role);
    console.log('👤 User verified:', user.isVerified);
    console.log('🔒 Stored hash:', user.password);
    console.log('🔒 Hash length:', user.password?.length);
    console.log('🔒 Hash starts with:', user.password?.substring(0, 7));

    // Check password
    const isMatch = await user.comparePassword(password);
    console.log('🔐 Password match result:', isMatch);

    if (!isMatch) {
      console.log('❌ PASSWORD MISMATCH — check the hash');
      console.log('============================================\n');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check verification (skip for admin)
    if (!user.isVerified && user.role !== 'admin') {
      console.log('❌ User not verified');
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Check teacher approval
    if (user.role === 'teacher' && !user.isApproved) {
      console.log('❌ Teacher not approved');
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

    console.log('✅ LOGIN SUCCESS for:', user.email);
    console.log('============================================\n');

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
    console.log('============================================\n');
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