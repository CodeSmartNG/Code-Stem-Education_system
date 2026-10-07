// backend/routes/payments.js
const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Lesson = require('../models/Lesson');

const router = express.Router();

// ============================================
// INITIALIZE PAYSTACK PAYMENT (redirect flow)
// POST /api/payments/initialize
// ============================================
router.post('/initialize', auth, async (req, res) => {
  try {
    const { lessonId, email, name, userId } = req.body;

    console.log('\n🚀 ===== INITIALIZE PAYMENT =====');
    console.log('📌 Lesson:', lessonId);
    console.log('📧 Email:', email);
    console.log('👤 User:', req.user._id);

    if (!lessonId || !email) {
      return res.status(400).json({
        success: false,
        message: 'lessonId and email are required',
      });
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const reference = `lesson_${lessonId}_${userId || req.user._id}_${Date.now()}`;
    const frontendUrl = process.env.FRONTEND_URL || 'https://code-stem-education-system-i5dv.vercel.app';

    console.log('📌 Reference:', reference);
    console.log('💵 Amount (kobo):', Math.round(lesson.price * 100));

    // ✅ Call Paystack initialize API
    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        amount: Math.round(lesson.price * 100),
        currency: 'NGN',
        reference: reference,
        callback_url: `${frontendUrl}/payment-callback?ref=${reference}&lesson=${lessonId}`,
        metadata: {
          custom_fields: [
            {
              display_name: 'Student',
              variable_name: 'student_name',
              value: name || 'Student',
            },
            {
              display_name: 'Lesson',
              variable_name: 'lesson_title',
              value: lesson.title || 'Lesson',
            },
            {
              display_name: 'Lesson ID',
              variable_name: 'lesson_id',
              value: lessonId,
            },
          ],
        },
      }),
    });

    const paystackData = await paystackRes.json();

    console.log('📩 Paystack init response:', paystackData.status ? 'OK' : 'FAILED');

    if (!paystackData.status || !paystackData.data?.authorization_url) {
      console.error('❌ Paystack init failed:', paystackData);
      return res.status(400).json({
        success: false,
        message: paystackData.message || 'Failed to initialize payment',
      });
    }

    console.log('✅ Authorization URL:', paystackData.data.authorization_url);

    return res.json({
      success: true,
      data: {
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      },
    });
  } catch (error) {
    console.error('❌ Initialize error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// VERIFY PAYSTACK PAYMENT
// POST /api/payments/verify
// ============================================
router.post('/verify', auth, async (req, res) => {
  try {
    const { reference, lessonId, courseId, teacherId } = req.body;

    console.log('\n💰 ===== VERIFY PAYMENT =====');
    console.log('📌 Reference:', reference);
    console.log('📌 Lesson:', lessonId);
    console.log('👤 User:', req.user._id);

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference is required',
      });
    }

    // ✅ Call Paystack verify API
    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      console.error('❌ Paystack verification failed:', paystackData);
      return res.status(400).json({
        success: false,
        message: 'Payment not successful',
      });
    }

    // ✅ Get lesson to verify amount
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    // ✅ Verify amount matches (in kobo)
    const expectedKobo = Math.round(lesson.price * 100);
    if (paystackData.data.amount !== expectedKobo) {
      console.error(
        `❌ Amount mismatch: paid ${paystackData.data.amount}, expected ${expectedKobo}`
      );
      return res.status(400).json({
        success: false,
        message: 'Payment amount mismatch',
      });
    }

    // ✅ Credit teacher wallet
    const platformCommission = 0.15;
    const teacherCut = lesson.price * (1 - platformCommission);

    // Use teacherId from body OR from the lesson
    const actualTeacherId = teacherId || lesson.teacherId;

    if (actualTeacherId) {
      await User.findByIdAndUpdate(actualTeacherId, {
        $inc: {
          'wallet.balance': teacherCut,
          'wallet.totalEarnings': teacherCut,
        },
        $push: {
          'wallet.transactions': {
            type: 'credit',
            amount: teacherCut,
            description: `Lesson sale: ${lesson.title}`,
            reference,
            createdAt: new Date(),
          },
        },
      });
      console.log('✅ Teacher wallet credited:', teacherCut);
    } else {
      console.warn('⚠️ No teacherId — teacher not credited');
    }

    console.log('✅ Payment verified successfully');

    return res.json({
      success: true,
      message: 'Payment verified',
      data: {
        reference,
        amount: lesson.price,
        lessonId,
      },
    });
  } catch (error) {
    console.error('❌ Payment verify error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// PAYSTACK WEBHOOK
// POST /api/payments/webhook
// ============================================
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        console.error('❌ Invalid webhook signature');
        return res.sendStatus(401);
      }

      const event = req.body;
      console.log('📩 Paystack webhook event:', event.event);

      if (event.event === 'charge.success') {
        console.log('💰 Webhook: charge.success', event.data.reference);
        // TODO: Idempotency check — only credit once
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook error:', error);
      res.sendStatus(500);
    }
  }
);

module.exports = router;
