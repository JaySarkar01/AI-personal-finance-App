const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth');
const { getAnalytics, explainAnalytics } = require('../controllers/analyticsController');

const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, insight: null, message: 'Too many AI requests.' } });

router.use(protect);
router.get('/', getAnalytics);
router.post('/explain', aiLimiter, explainAnalytics);

module.exports = router;
