const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/auth');
const { getBudgets, createBudget, updateBudget, deleteBudget, explainBudget } = require('../controllers/budgetController');

const aiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, insight: null, message: 'Too many AI requests.' } });

router.use(protect);

router.route('/')
  .get(getBudgets)
  .post(createBudget);

router.route('/:id')
  .put(updateBudget)
  .delete(deleteBudget);

router.post('/:id/explain', aiLimiter, explainBudget);

module.exports = router;
