const User = require('../models/User');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// ============================================
// REGISTER CONTROLLER - FIXED
// ============================================

exports.register = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: fullName, email, password'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user - FIXED: Use 'name' not 'fullName'
    const user = await User.create({
      name: fullName,  // ← FIXED: Model uses 'name', not 'fullName'
      email,
      password,
      role: role || 'student',  // ← Default role
      isVerified: false,
      isApproved: role === 'admin' ? true : false
    });

    // Generate verification token
    const verificationToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Store token in user document (optional)
    user.verificationToken = verificationToken;
    await user.save();

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    await sendEmail({
      to: email,
      subject: 'Verify Your Email - STEM Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #4F46E5; 
              color: white !important; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 STEM Platform</h1>
            </div>
            <div class="content">
              <h2>Welcome, ${fullName}!</h2>
              <p>Thank you for registering on our STEM Learning Platform.</p>
              <p>Please click the button below to verify your email address:</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">✅ Verify Email</a>
              </div>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 STEM Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

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
// LOGIN CONTROLLER - WITH DEBUG LOGS
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

    // ✅ DEBUG LOGS
    console.log('\n🔍 ========== LOGIN ATTEMPT ==========');
    console.log('📧 Email:', email);
    console.log('🔑 Password received:', password);
    console.log('🔑 Password length:', password.length);
    console.log('🔑 Password type:', typeof password);

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

    // ✅ DEBUG: Show stored hash
    console.log('🔒 Stored hash:', user.password);
    console.log('🔒 Hash starts with:', user.password?.substring(0, 7));
    console.log('🔒 Hash length:', user.password?.length);

    // Check password
    const isMatch = await user.comparePassword(password);
    
    console.log('✅ Password match result:', isMatch);
    console.log('=========================================\n');

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ... rest of code stays same

// ============================================
// GET CURRENT USER CONTROLLER
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
// VERIFY EMAIL CONTROLLER
// ============================================

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    // Mark as verified
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
        message: 'Verification token has expired. Please request a new one.'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// ============================================
// RESEND VERIFICATION EMAIL
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

    // Generate new token
    const verificationToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    user.verificationToken = verificationToken;
    await user.save();

    // Send new verification email
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