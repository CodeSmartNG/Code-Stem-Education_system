// backend/routes/payments.js
const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Lesson = require('../models/Lesson');

const router = express.Router();

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
    const platformCommission = 0.15; // 15% cut — adjust as needed
    const teacherCut = lesson.price * (1 - platformCommission);

    if (teacherId) {
      await User.findByIdAndUpdate(teacherId, {
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
    }

    console.log('✅ Payment verified + teacher wallet credited');

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
        // TODO: Idempotency check — only credit once
        console.log('💰 Webhook: charge.success', event.data.reference);
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook error:', error);
      res.sendStatus(500);
    }
  }
);

module.exports = router;
