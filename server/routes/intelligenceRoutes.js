const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth');
const { getIntelligence, explainIntelligence } = require('../controllers/intelligenceController');

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, insight: null, message: 'Too many AI requests.' }
});

router.use(protect);
router.get('/', getIntelligence);
router.post('/explain', aiLimiter, explainIntelligence);

module.exports = router;
