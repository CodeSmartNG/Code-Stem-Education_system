const crypto = require('crypto');
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
    // Clean input
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    console.log('\n============================================');
    console.log('🔍 LOGIN ATTEMPT');
    console.log('📧 Email:', email);
    console.log('📧 Email length:', email.length);
    console.log('🔑 Password received:', password.length > 0);
    console.log('🔑 Password length:', password.length);

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');

      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and explicitly include password
    const user = await User.findOne({ email }).select('+password');

    console.log('👤 User found:', !!user);

    if (!user) {
      console.log('❌ No user found for:', email);
      console.log('============================================\n');

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('👤 User ID:', user._id);
    console.log('👤 User name:', user.name);
    console.log('👤 User email:', user.email);
    console.log('👤 User role:', user.role);
    console.log('👤 Verified:', user.isVerified);
    console.log('👤 Approved:', user.isApproved);
    console.log('🔒 Password exists:', !!user.password);
    console.log('🔒 Hash length:', user.password?.length);
    console.log(
      '🔒 Hash prefix:',
      user.password ? user.password.substring(0, 7) : 'NO HASH'
    );

    // Check password
    const isMatch = await user.comparePassword(password);

    console.log('🔐 Password match:', isMatch);

    if (!isMatch) {
      console.log('❌ PASSWORD MISMATCH');
      console.log('============================================\n');

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Admin does not need email verification
    if (!user.isVerified && user.role !== 'admin') {
      console.log('❌ Email not verified');

      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Teacher approval
    if (user.role === 'teacher' && !user.isApproved) {
      console.log('❌ Teacher not approved');

      return res.status(403).json({
        success: false,
        message: 'Your teacher account is pending approval'
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '7d'
      }
    );

    console.log('✅ LOGIN SUCCESS');
    console.log('============================================\n');

    // ✅ Send response — include id and uid
const userId = user._id.toString();

res.status(200).json({
  success: true,
  token: token,
  user: {
    id: userId,
    uid: userId,
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

    return res.status(500).json({
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
    console.log('🔍 getMe — req.user.id:', req.user?.id);

    const user = await User.findById(req.user.id);
    console.log('🔍 getMe — found user:', !!user, '| _id:', user?._id);

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

    // ✅ Ensure both id and uid exist for compatibility
    const userId = user._id.toString();

    res.status(200).json({
      success: true,
      user: {
        ...userResponse,
        id: userId,
        uid: userId
      }
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



// ============================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ============================================

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token before saving to database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    // Build reset link (using the raw token, not hashed)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    console.log('🔐 Reset link generated for:', email);

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset Your Password - STEM Platform',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Hello ${user.name},</p>
            <p>You requested to reset your password. Click the button below to set a new password:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #0ea5e9; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Reset Password
            </a>
            <p><strong>This link expires in 15 minutes.</strong></p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #666; font-size: 12px;">
              For security, please do not share this link with anyone.
            </p>
          </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Email send failed:', emailError.message);
      // Reset the token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent. Please check your inbox.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// ============================================
// RESET PASSWORD
// POST /api/auth/reset-password/:token
// ============================================

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with matching token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link. Please request a new one.'
      });
    }

    // Set new password (will be hashed by User model's pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    console.log('✅ Password reset for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
