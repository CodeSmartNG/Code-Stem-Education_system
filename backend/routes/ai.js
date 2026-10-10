// backend/routes/ai.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/auth');

const AIMessage = require('../models/AIMessage');
// ============================================
// RATE LIMIT — per USER, not per IP
// ============================================
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  // Key by user ID when authenticated, fall back to IP
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many requests. Please wait a minute.',
  },
});

// ============================================
// SYSTEM PROMPTS PER ROLE
// ============================================
const systemPrompts = {
  student: `You are a helpful STEM tutor for CodeSmartNG, an education platform in Nigeria.
Your job is to help students UNDERSTAND concepts, not give them direct answers.
Guide them with explanations, examples, and questions.
If a student asks for an answer to a quiz, respond: "I can't give the answer, but I can help you understand so you can figure it out. What part is confusing?"
Use simple English, short sentences. Naira and Nigerian examples are welcome.
Keep responses under 200 words unless the student asks for more detail.`,

  teacher: `You are an AI teaching assistant for CodeSmartNG.
Help teachers create lesson content, quiz questions, course descriptions, and explanations.
Be practical and specific. Offer multiple options when useful.
Keep responses concise and actionable.`,

  admin: `You are an AI assistant for CodeSmartNG platform administrators.
Help with reports, user insights, and platform operations.
Be factual. If you don't have data, say so. Suggest how to get it.`,
};

// ============================================
// HELPERS
// ============================================
const MAX_HISTORY_MESSAGES = 20;   // how many past messages we send to Gemini
const MAX_MESSAGE_LENGTH = 4000;   // per-message character cap

function sanitizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];
  return rawMessages
    .filter((m) => m && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.slice(0, MAX_MESSAGE_LENGTH),
    }));
}

// ============================================
// GET /api/ai/history
// Returns ONLY the caller's messages.
// ============================================
router.get('/history', auth, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user._id })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('❌ History error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load history' });
  }
});

// ============================================
// DELETE /api/ai/history
// Deletes ONLY the caller's messages.
// ============================================
router.delete('/history', auth, async (req, res) => {
  try {
    await Message.deleteMany({ userId: req.user._id });
    return res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to clear history' });
  }
});

// ============================================
// POST /api/ai/chat
// ============================================
router.post('/chat', auth, aiLimiter, async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'AI service is not configured',
      });
    }

    // ✅ Never trust client-supplied history. Load from DB.
    const { messages: rawMessages } = req.body;
    const incoming = sanitizeMessages(rawMessages);

    if (incoming.length === 0 || incoming[incoming.length - 1].role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'A user message is required',
      });
    }

    // The latest user message is what we persist + send.
    const userText = incoming[incoming.length - 1].content;

    // ✅ Save the user message to DB, scoped to the authenticated user.
    await Message.create({
      userId: req.user._id,
      role: 'user',
      content: userText,
    });

    // ✅ Build Gemini conversation from DB (source of truth), not from the client.
    const dbHistory = await Message.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY_MESSAGES)
      .lean();

    // Reverse to chronological order
    dbHistory.reverse();

    const contents = dbHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const role = req.user.role || 'student';
    const systemPrompt = systemPrompts[role] || systemPrompts.student;

    const MODEL = 'gemini-3.8-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            thinking_level: 'medium',
            maxOutputTokens: 1024,
          },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Gemini error:', data);
      return res.status(response.status).json({
        success: false,
        message: data.error?.message || 'AI request failed',
      });
    }

    const aiText =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join('') || null;

    if (!aiText) {
      console.error('❌ No text in response:', JSON.stringify(data).slice(0, 500));
      return res.status(500).json({
        success: false,
        message: 'AI returned no response',
      });
    }

    // ✅ Persist assistant reply
    await Message.create({
      userId: req.user._id,
      role: 'assistant',
      content: aiText.slice(0, 8000),
    });

    return res.json({ success: true, reply: aiText });
    
} catch (error) {
  console.error('❌ AI route error:', error);
  console.error('❌ Name:', error.name);
  console.error('❌ Message:', error.message);
  console.error('❌ Stack:', error.stack);

  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'AI request failed'
      : error.message,      // ✅ real reason in dev
  });
}
});

module.exports = router;
