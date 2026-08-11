const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth');
const { askAI } = require('../controllers/aiController');

// AI specific rate limiting: 10 requests per 15 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many AI requests. Please try again later.', insight: null, answer: null },
});

router.use(protect);
router.post('/chat', aiLimiter, askAI);

module.exports = router;
