// backend/routes/ai.js
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// ✅ Rate limit: 15 messages per minute per IP
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { success: false, message: 'Too many requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
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
// POST /api/ai/chat
// ============================================
router.post('/chat', auth, aiLimiter, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Messages array is required',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'AI service is not configured',
      });
    }

    // ✅ Get system prompt based on user role
    const role = req.user.role || 'student';
    const systemPrompt = systemPrompts[role] || systemPrompts.student;

    // ✅ Format messages for Gemini
    // Gemini uses "user" and "model" roles
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt + '\n\nAcknowledge briefly and wait for my question.' }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. Ready to help.' }],
      },
      ...messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    ];

    // ✅ Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.95,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Gemini error:', data);
      return res.status(response.status).json({
        success: false,
        message: data.error?.message || 'AI request failed',
      });
    }

    // ✅ Extract AI response
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) {
      return res.status(500).json({
        success: false,
        message: 'AI returned no response',
      });
    }

    console.log(`🤖 AI [${role}]:`, aiText.slice(0, 80) + '...');

    return res.json({
      success: true,
      reply: aiText,
    });
  } catch (error) {
    console.error('❌ AI route error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'AI request failed',
    });
  }
});

module.exports = router;
