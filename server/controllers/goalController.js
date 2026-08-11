const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const Account = require('../models/Account');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// @desc  Get all goals
// @route GET /api/goals
exports.getGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id })
      .populate('linkedAccount', 'name type balanceCents icon color')
      .lean();

    const now = new Date();
    const ist = new Date(now.getTime() + IST_OFFSET_MS);

    const result = goals.map((g) => {
      // If linked account exists, use its balance as current
      const currentCents = g.linkedAccount ? Math.max(0, g.linkedAccount.balanceCents) : g.currentCents;
      const target = g.targetCents / 100;
      const current = currentCents / 100;
      const remainingCents = Math.max(0, g.targetCents - currentCents);
      const remaining = remainingCents / 100;
      const progressPct = g.targetCents > 0 ? Math.min(100, Math.round((currentCents / g.targetCents) * 10000) / 100) : 0;

      // Calculate required monthly contribution
      let reqMonthly = null;
      let monthsLeft = null;
      if (g.deadline && remainingCents > 0) {
        const d = new Date(g.deadline);
        const diffMs = d.getTime() - ist.getTime();
        monthsLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.44));
        if (monthsLeft > 0) {
          reqMonthly = Math.round(remaining / monthsLeft);
        } else {
          reqMonthly = remaining; // Overdue or this month
        }
      }

      return {
        ...g,
        target,
        current,
        remaining,
        progressPct,
        reqMonthly,
        monthsLeft,
      };
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// @desc  Create goal
// @route POST /api/goals
exports.createGoal = async (req, res, next) => {
  try {
    const { name, target, current, linkedAccount, deadline, icon, color, priority, notes } = req.body;
    if (!name || !target) return res.status(400).json({ success: false, message: 'Name and target are required' });

    const targetCents = Math.round(parseFloat(target) * 100);
    const currentCents = current ? Math.round(parseFloat(current) * 100) : 0;

    if (linkedAccount) {
      const acc = await Account.findOne({ _id: linkedAccount, user: req.user._id });
      if (!acc) return res.status(404).json({ success: false, message: 'Linked account not found' });
    }

    const goal = await Goal.create({
      user: req.user._id,
      name,
      targetCents,
      currentCents,
      linkedAccount: linkedAccount || null,
      deadline: deadline ? new Date(deadline) : null,
      icon, color, priority, notes
    });
    res.status(201).json({ success: true, data: goal });
  } catch (err) { next(err); }
};

// @desc  Update goal
// @route PUT /api/goals/:id
exports.updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });

    const { name, target, current, linkedAccount, deadline, icon, color, priority, notes, isCompleted } = req.body;
    
    if (name !== undefined) goal.name = name;
    if (target !== undefined) goal.targetCents = Math.round(parseFloat(target) * 100);
    if (current !== undefined) goal.currentCents = Math.round(parseFloat(current) * 100);
    
    if (linkedAccount !== undefined) {
      if (linkedAccount) {
        const acc = await Account.findOne({ _id: linkedAccount, user: req.user._id });
        if (!acc) return res.status(404).json({ success: false, message: 'Linked account not found' });
      }
      goal.linkedAccount = linkedAccount || null;
    }
    
    if (deadline !== undefined) goal.deadline = deadline ? new Date(deadline) : null;
    if (icon !== undefined) goal.icon = icon;
    if (color !== undefined) goal.color = color;
    if (priority !== undefined) goal.priority = priority;
    if (notes !== undefined) goal.notes = notes;
    if (isCompleted !== undefined) goal.isCompleted = isCompleted;

    await goal.save();
    res.status(200).json({ success: true, data: goal });
  } catch (err) { next(err); }
};

// @desc  Delete goal
// @route DELETE /api/goals/:id
exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' });
    res.status(200).json({ success: true, message: 'Goal deleted' });
  } catch (err) { next(err); }
};

// @desc  AI explain a single goal (compact payload only)
// @route POST /api/goals/:id/explain
exports.explainGoal = async (req, res, next) => {
  try {
    const { goalName, target, current, remaining, progressPct, reqMonthly, monthsLeft, priority } = req.body;
    if (!goalName || target === undefined) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    
    const { generateContent } = require('../services/aiService');
    const inr = (n) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
    
    let deadlineStr = monthsLeft ? `${monthsLeft} months left` : 'No deadline';
    
    const prompt = `You are a friendly Indian personal finance advisor. Give 2-3 concise, actionable suggestions (max 80 words total) about this financial goal in simple English.

Goal: ${goalName} (Priority: ${priority})
Target: ${inr(target)} | Current: ${inr(current)} (${progressPct}%)
Remaining: ${inr(remaining)} | Deadline: ${deadlineStr}
Required Monthly: ${reqMonthly ? inr(reqMonthly) : 'N/A'}

Give practical tips as 2-3 bullet points.`;

    const resultText = await generateContent(prompt);
    if (!resultText) throw new Error('AI generation failed');
    res.status(200).json({ success: true, insight: resultText });
  } catch {
    res.status(200).json({ success: false, insight: null, message: 'AI insight unavailable' });
  }
};
