const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth');
const { getGoals, createGoal, updateGoal, deleteGoal, explainGoal } = require('../controllers/goalController');

const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, insight: null, message: 'Too many AI requests.' } });

router.use(protect);

router.route('/')
  .get(getGoals)
  .post(createGoal);

router.route('/:id')
  .put(updateGoal)
  .delete(deleteGoal);

router.post('/:id/explain', aiLimiter, explainGoal);

module.exports = router;
