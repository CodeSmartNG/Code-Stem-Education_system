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
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;

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
// ============================================
router.get('/history', auth, async (req, res) => {
  try {
    const messages = await AIMessage.find({ userId: req.user._id })
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
// ============================================
router.delete('/history', auth, async (req, res) => {
  try {
    await AIMessage.deleteMany({ userId: req.user._id });
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

    const { messages: rawMessages } = req.body;
    const incoming = sanitizeMessages(rawMessages);

    if (incoming.length === 0 || incoming[incoming.length - 1].role !== 'user') {
      return res.status(400).json({
        success: false,
        message: 'A user message is required',
      });
    }

    const userText = incoming[incoming.length - 1].content;

    // ✅ Save user message
    await AIMessage.create({
      userId: req.user._id,
      role: 'user',
      content: userText,
    });

    // ✅ Load history from DB (source of truth)
    const dbHistory = await AIMessage.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(MAX_HISTORY_MESSAGES)
      .lean();

    dbHistory.reverse();

    const contents = dbHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const role = req.user.role || 'student';
    const systemPrompt = systemPrompts[role] || systemPrompts.student;


    
    // ... (above: build `contents`, `systemPrompt`, `role`)

const MODEL = 'gemini-3.8-flash';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

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
        maxOutputTokens: 1024,
        // ✅ Start with no thinkingConfig. Add later if needed.
      },
    }),
  });
} catch (fetchErr) {
  clearTimeout(timeout);
  console.error('❌ Fetch failed:', fetchErr.name, fetchErr.message);
  return res.status(504).json({
    success: false,
    message: fetchErr.name === 'AbortError'
      ? 'AI took too long. Please try again.'
      : `Network error: ${fetchErr.message}`,
  });
}
clearTimeout(timeout);

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

    // ✅ Save assistant reply
    await AIMessage.create({
      userId: req.user._id,
      role: 'assistant',
      content: aiText.slice(0, 8000),
    });

    return res.json({ success: true, reply: aiText });
    
  } catch (error) {
  console.error('========================================');
  console.error('❌ AI ROUTE ERROR');
  console.error('Name:', error.name);
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  console.error('========================================');

  return res.status(500).json({
    success: false,
    message: 'AI request failed. Please try again.',
  });
}
});

module.exports = router;
