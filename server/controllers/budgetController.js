const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Get IST month boundaries for a given year/month (1-indexed).
 */
const monthBounds = (year, month) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999) - IST_OFFSET_MS);
  return { start, end };
};

/**
 * Deterministic warning level — no AI needed.
 * warning: spent >= 80%
 * exceeded: spent >= 100%
 */
const warningLevel = (spentCents, limitCents) => {
  const pct = limitCents > 0 ? (spentCents / limitCents) * 100 : 0;
  if (pct >= 100) return 'exceeded';
  if (pct >= 80) return 'warning';
  return 'ok';
};

// @desc  Get all budgets with live spent amounts
// @route GET /api/budgets?month=8&year=2025
exports.getBudgets = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const now = new Date();
    const ist = new Date(now.getTime() + IST_OFFSET_MS);

    const month = parseInt(req.query.month) || (ist.getUTCMonth() + 1);
    const year = parseInt(req.query.year) || ist.getUTCFullYear();
    const { start, end } = monthBounds(year, month);

    // Fetch active budgets (recurring or matching this month/year)
    const budgets = await Budget.find({
      user: userId,
      isActive: true,
      $or: [
        { month: null },
        { month, year },
      ],
    }).populate('category', 'name icon color').lean();

    if (!budgets.length) {
      return res.status(200).json({ success: true, data: [], month, year });
    }

    // Aggregate actual spend per category for this month
    const spendByCategory = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', spentCents: { $sum: '$amountCents' } } },
    ]);
    const spendMap = {};
    for (const s of spendByCategory) {
      if (s._id) spendMap[s._id.toString()] = s.spentCents;
    }

    // Also compute total spend across all categories (for budgets without a category)
    const totalSpentCents = await Transaction.aggregate([
      { $match: { user: userId, type: 'expense', date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amountCents' } } },
    ]);
    const totalExpense = totalSpentCents[0]?.total ?? 0;

    const result = budgets.map((b) => {
      const catId = b.category?._id?.toString();
      const spentCents = catId ? (spendMap[catId] ?? 0) : totalExpense;
      const remainingCents = Math.max(0, b.limitCents - spentCents);
      const pct = b.limitCents > 0 ? Math.min(100, Math.round((spentCents / b.limitCents) * 10000) / 100) : 0;
      return {
        ...b,
        limit: b.limitCents / 100,
        spentCents,
        spent: spentCents / 100,
        remainingCents,
        remaining: remainingCents / 100,
        pct,
        status: warningLevel(spentCents, b.limitCents),
      };
    });

    res.status(200).json({ success: true, data: result, month, year });
  } catch (err) { next(err); }
};

// @desc  Create budget
// @route POST /api/budgets
exports.createBudget = async (req, res, next) => {
  try {
    const { name, categoryId, limit, period, month, year, color, icon, notes } = req.body;
    if (!name || !limit) return res.status(400).json({ success: false, message: 'Name and limit are required' });
    const limitCents = Math.round(parseFloat(limit) * 100);
    if (limitCents <= 0) return res.status(400).json({ success: false, message: 'Limit must be positive' });

    if (categoryId) {
      const cat = await Category.findOne({ _id: categoryId, $or: [{ user: req.user._id }, { isSystem: true }] });
      if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const budget = await Budget.create({
      user: req.user._id,
      name,
      category: categoryId || null,
      limitCents,
      period: period || 'monthly',
      month: month || null,
      year: year || null,
      color: color || '#0D9488',
      icon: icon || '📊',
      notes: notes || '',
    });
    res.status(201).json({ success: true, data: budget });
  } catch (err) { next(err); }
};

// @desc  Update budget
// @route PUT /api/budgets/:id
exports.updateBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });

    const { name, categoryId, limit, period, month, year, color, icon, notes, isActive } = req.body;
    if (name !== undefined) budget.name = name;
    
    if (categoryId !== undefined) {
      if (categoryId) {
        const cat = await Category.findOne({ _id: categoryId, $or: [{ user: req.user._id }, { isSystem: true }] });
        if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
      }
      budget.category = categoryId || null;
    }
    
    if (limit !== undefined) budget.limitCents = Math.round(parseFloat(limit) * 100);
    if (period !== undefined) budget.period = period;
    if (month !== undefined) budget.month = month;
    if (year !== undefined) budget.year = year;
    if (color !== undefined) budget.color = color;
    if (icon !== undefined) budget.icon = icon;
    if (notes !== undefined) budget.notes = notes;
    if (isActive !== undefined) budget.isActive = isActive;
    await budget.save();
    res.status(200).json({ success: true, data: budget });
  } catch (err) { next(err); }
};

// @desc  Delete budget
// @route DELETE /api/budgets/:id
exports.deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found' });
    res.status(200).json({ success: true, message: 'Budget deleted' });
  } catch (err) { next(err); }
};

// @desc  AI explain a single budget (compact payload only)
// @route POST /api/budgets/:id/explain
exports.explainBudget = async (req, res, next) => {
  try {
    const { budgetName, limit, spent, remaining, pct, category, status } = req.body;
    if (!budgetName || limit === undefined) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    const { generateContent } = require('../services/aiService');
    const inr = (n) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
    const prompt = `You are a friendly Indian personal finance advisor. Give 2-3 concise, actionable suggestions (max 80 words total) about this budget in simple English.

Budget: ${budgetName}${category ? ` (${category})` : ''}
Limit: ${inr(limit)} | Spent: ${inr(spent)} (${pct}%) | Remaining: ${inr(remaining)}
Status: ${status === 'exceeded' ? '🔴 EXCEEDED' : status === 'warning' ? '🟡 WARNING (>80%)' : '🟢 On track'}

Give practical tips as 2-3 bullet points.`;

    const resultText = await generateContent(prompt);
    if (!resultText) throw new Error('AI generation failed');
    res.status(200).json({ success: true, insight: resultText });
  } catch {
    res.status(200).json({ success: false, insight: null, message: 'AI insight unavailable' });
  }
};
