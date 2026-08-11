const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const Category = require('../models/Category');

// @desc  Calculate next payment date based on frequency
const calcNextPaymentDate = (startDate, frequency, intervalDays) => {
  const date = new Date(startDate);
  const now = new Date();
  
  // If startDate is in the future, it is the next payment date
  if (date > now) return date;

  // Catch up to current or next payment
  while (date <= now) {
    if (frequency === 'daily') date.setDate(date.getDate() + 1);
    else if (frequency === 'weekly') date.setDate(date.getDate() + 7);
    else if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
    else if (frequency === 'quarterly') date.setMonth(date.getMonth() + 3);
    else if (frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);
    else if (frequency === 'custom' && intervalDays) date.setDate(date.getDate() + intervalDays);
    else break; // safety
  }
  return date;
};

// @desc Calculate equivalent amounts (monthly and annual)
const calcEquivalents = (amount, frequency, intervalDays) => {
  let annual = 0;
  if (frequency === 'daily') annual = amount * 365;
  else if (frequency === 'weekly') annual = amount * 52.14;
  else if (frequency === 'monthly') annual = amount * 12;
  else if (frequency === 'quarterly') annual = amount * 4;
  else if (frequency === 'yearly') annual = amount;
  else if (frequency === 'custom' && intervalDays > 0) annual = amount * (365 / intervalDays);
  
  return {
    monthlyEquivalent: annual / 12,
    annualEquivalent: annual
  };
};

// @desc  Get all subscriptions
// @route GET /api/subscriptions
exports.getSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ user: req.user._id })
      .populate('category', 'name icon color')
      .sort({ nextPaymentDate: 1 })
      .lean();

    const result = subscriptions.map((sub) => {
      const amount = sub.amountCents / 100;
      const eqs = calcEquivalents(amount, sub.frequency, sub.intervalDays);
      
      // Calculate days until next payment
      const now = new Date();
      now.setHours(0,0,0,0);
      const nextPay = new Date(sub.nextPaymentDate);
      nextPay.setHours(0,0,0,0);
      const diffTime = nextPay - now;
      const daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...sub,
        amount,
        monthlyEquivalent: eqs.monthlyEquivalent,
        annualEquivalent: eqs.annualEquivalent,
        daysUntilNext
      };
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// @desc  Create subscription
// @route POST /api/subscriptions
exports.createSubscription = async (req, res, next) => {
  try {
    const { name, amount, categoryId, frequency, intervalDays, startDate, autoPay, isActive, color, icon, notes, type } = req.body;
    if (!name || !amount) return res.status(400).json({ success: false, message: 'Name and amount are required' });

    const amountCents = Math.round(parseFloat(amount) * 100);
    const start = startDate ? new Date(startDate) : new Date();
    const nextPaymentDate = calcNextPaymentDate(start, frequency || 'monthly', intervalDays);

    if (categoryId) {
      const cat = await Category.findOne({ _id: categoryId, $or: [{ user: req.user._id }, { isSystem: true }] });
      if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const sub = await Subscription.create({
      user: req.user._id,
      name,
      amountCents,
      category: categoryId || null,
      frequency: frequency || 'monthly',
      intervalDays: intervalDays || null,
      startDate: start,
      nextPaymentDate,
      autoPay: autoPay || false,
      isActive: isActive !== undefined ? isActive : true,
      color, icon, notes,
      type: type || 'subscription'
    });
    res.status(201).json({ success: true, data: sub });
  } catch (err) { next(err); }
};

// @desc  Update subscription
// @route PUT /api/subscriptions/:id
exports.updateSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });

    const { name, amount, categoryId, frequency, intervalDays, startDate, autoPay, isActive, color, icon, notes, type } = req.body;
    
    let recalcNext = false;
    
    if (name !== undefined) sub.name = name;
    if (amount !== undefined) sub.amountCents = Math.round(parseFloat(amount) * 100);
    
    if (categoryId !== undefined) {
      if (categoryId) {
        const cat = await Category.findOne({ _id: categoryId, $or: [{ user: req.user._id }, { isSystem: true }] });
        if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
      }
      sub.category = categoryId || null;
    }
    
    if (frequency !== undefined) { sub.frequency = frequency; recalcNext = true; }
    if (intervalDays !== undefined) { sub.intervalDays = intervalDays || null; recalcNext = true; }
    if (startDate !== undefined) { sub.startDate = new Date(startDate); recalcNext = true; }
    
    if (autoPay !== undefined) sub.autoPay = autoPay;
    if (isActive !== undefined) sub.isActive = isActive;
    if (color !== undefined) sub.color = color;
    if (icon !== undefined) sub.icon = icon;
    if (notes !== undefined) sub.notes = notes;
    if (type !== undefined) sub.type = type;

    if (recalcNext) {
      sub.nextPaymentDate = calcNextPaymentDate(sub.startDate, sub.frequency, sub.intervalDays);
    }

    await sub.save();
    res.status(200).json({ success: true, data: sub });
  } catch (err) { next(err); }
};

// @desc  Delete subscription
// @route DELETE /api/subscriptions/:id
exports.deleteSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!sub) return res.status(404).json({ success: false, message: 'Subscription not found' });
    res.status(200).json({ success: true, message: 'Subscription deleted' });
  } catch (err) { next(err); }
};

// @desc  AI explain/optimize subscription (compact payload only)
// @route POST /api/subscriptions/:id/explain
exports.explainSubscription = async (req, res, next) => {
  try {
    const { name, type, amount, frequency, annualEquivalent, category } = req.body;
    if (!name || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }
    
    const { generateContent } = require('../services/aiService');
    const inr = (n) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
    
    const prompt = `You are a friendly Indian personal finance advisor. Give 2-3 concise, actionable suggestions (max 80 words total) about this recurring payment/subscription in simple English.
    
Payment: ${name} (${type})${category ? ` in ${category}` : ''}
Cost: ${inr(amount)} per ${frequency}
Annual Equivalent: ${inr(annualEquivalent)}

Give practical optimization tips, alternatives, or reminders as 2-3 bullet points. Do NOT claim the user isn't using it unless you explicitly state it's a general tip.`;

    const resultText = await generateContent(prompt);
    if (!resultText) throw new Error('AI generation failed');
    res.status(200).json({ success: true, insight: resultText });
  } catch {
    res.status(200).json({ success: false, insight: null, message: 'AI insight unavailable' });
  }
};
