const { GoogleGenAI } = require('@google/genai');

// Simple in-memory cache for AI responses
const aiCache = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

const getAIClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

const getModelName = () => process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of aiCache.entries()) {
    if (now > value.expiresAt) {
      aiCache.delete(key);
    }
  }
}, 1000 * 60 * 15).unref();

/**
 * Generate content using Gemini with caching.
 * @param {string} prompt - The prompt to send.
 * @param {boolean} bypassCache - If true, ignores the cache.
 * @returns {Promise<string|null>}
 */
exports.generateContent = async (prompt, bypassCache = false) => {
  try {
    const cacheKey = Buffer.from(prompt).toString('base64');
    
    if (!bypassCache && aiCache.has(cacheKey)) {
      const cached = aiCache.get(cacheKey);
      if (Date.now() < cached.expiresAt) {
        return cached.text;
      } else {
        aiCache.delete(cacheKey);
      }
    }

    const ai = getAIClient();
    const result = await ai.models.generateContent({
      model: getModelName(),
      contents: prompt,
    });
    
    const text = result.text;
    
    // Store in cache
    aiCache.set(cacheKey, {
      text,
      expiresAt: Date.now() + CACHE_TTL
    });

    return text;
  } catch (error) {
    console.error('AI Generation Error:', error.message);
    return null; // Fail gracefully
  }
};
