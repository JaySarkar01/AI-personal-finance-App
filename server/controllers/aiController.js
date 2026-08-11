const { generateContent } = require('../services/aiService');

// @desc  Ask AI a financial question (chat)
// @route POST /api/ai/chat
exports.askAI = async (req, res, next) => {
  try {
    const { question, context } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, message: 'Question is required' });
    }

    // Limit context length and ensure it's not raw history
    const safeContext = typeof context === 'string' ? context.slice(0, 1000) : JSON.stringify(context || {}).slice(0, 1000);

    const prompt = `You are a helpful Indian personal finance assistant. Keep your response concise, friendly, and practical (max 150 words). Do NOT perform complex calculations, output tables, or make definitive financial claims. Be educational.

Context (if any):
${safeContext}

User Question:
${question}

Answer:`;

    const resultText = await generateContent(prompt, true); // Bypass cache for chat questions

    if (!resultText) {
      return res.status(200).json({ success: false, answer: 'Sorry, I am currently unavailable. Please try again later.' });
    }

    res.status(200).json({ success: true, answer: resultText });
  } catch (error) {
    res.status(200).json({ success: false, answer: 'Sorry, I am currently unavailable. Please try again later.' });
  }
};
