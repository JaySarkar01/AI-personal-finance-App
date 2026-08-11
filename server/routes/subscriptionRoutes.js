const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth');
const { getSubscriptions, createSubscription, updateSubscription, deleteSubscription, explainSubscription } = require('../controllers/subscriptionController');

const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, insight: null, message: 'Too many AI requests.' } });

router.use(protect);

router.route('/')
  .get(getSubscriptions)
  .post(createSubscription);

router.route('/:id')
  .put(updateSubscription)
  .delete(deleteSubscription);

router.post('/:id/explain', aiLimiter, explainSubscription);

module.exports = router;
