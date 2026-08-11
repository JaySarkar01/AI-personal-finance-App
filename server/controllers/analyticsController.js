const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/**
 * Resolve date range from a period string or custom dates.
 * Periods: thisMonth, lastMonth, 3months, 6months, fy, custom
 */
const resolvePeriod = (period, customStart, customEnd) => {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth(); // 0-based

  const toIST = (utcYear, utcMonth, day, h, min, s, ms) =>
    new Date(Date.UTC(utcYear, utcMonth, day, h, min, s, ms) - IST_OFFSET_MS);

  switch (period) {
    case 'lastMonth': {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      return {
        start: toIST(ly, lm, 1, 0, 0, 0, 0),
        end: toIST(ly, lm + 1, 0, 23, 59, 59, 999),
        label: MONTH_NAMES[lm],
        months: 1,
      };
    }
    case '3months': {
      const start = toIST(y, m - 2, 1, 0, 0, 0, 0);
      return { start, end: toIST(y, m + 1, 0, 23, 59, 59, 999), label: 'Last 3 Months', months: 3 };
    }
    case '6months': {
      const start = toIST(y, m - 5, 1, 0, 0, 0, 0);
      return { start, end: toIST(y, m + 1, 0, 23, 59, 59, 999), label: 'Last 6 Months', months: 6 };
    }
    case 'fy': {
      const fyStartYear = m >= 3 ? y : y - 1;
      return {
        start: toIST(fyStartYear, 3, 1, 0, 0, 0, 0),
        end: toIST(fyStartYear + 1, 2, 31, 23, 59, 59, 999),
        label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`,
        months: 12,
      };
    }
    case 'custom': {
      if (!customStart || !customEnd) break;
      return {
        start: new Date(customStart + 'T00:00:00+05:30'),
        end: new Date(customEnd + 'T23:59:59+05:30'),
        label: `${customStart} → ${customEnd}`,
        months: null,
      };
    }
    default: // thisMonth
      return {
        start: toIST(y, m, 1, 0, 0, 0, 0),
        end: toIST(y, m + 1, 0, 23, 59, 59, 999),
        label: MONTH_NAMES[m],
        months: 1,
      };
  }
  return {
    start: toIST(y, m, 1, 0, 0, 0, 0),
    end: toIST(y, m + 1, 0, 23, 59, 59, 999),
    label: MONTH_NAMES[m],
    months: 1,
  };
};

// @desc  Full analytics data for a period
// @route GET /api/analytics?period=6months
exports.getAnalytics = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { period = 'thisMonth', startDate, endDate } = req.query;
    const range = resolvePeriod(period, startDate, endDate);

    const baseMatch = {
      user: userId,
      date: { $gte: range.start, $lte: range.end },
    };

    // ── 1. Period totals ────────────────────────────────────────────────────
    const totals = await Transaction.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$type', totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } },
    ]);
    const tot = { income: 0, expense: 0 };
    for (const t of totals) {
      if (t._id === 'income') tot.income = t.totalCents;
      if (t._id === 'expense') tot.expense = t.totalCents;
    }
    const savingsCents = tot.income - tot.expense;
    const savingsRate = tot.income > 0 ? Math.round((savingsCents / tot.income) * 10000) / 100 : 0;

    // ── 2. Monthly trend (income, expense, savings) ─────────────────────────
    const monthlyTrend = await Transaction.aggregate([
      { $match: { user: userId, type: { $in: ['income', 'expense'] }, date: { $gte: range.start, $lte: range.end } } },
      {
        $group: {
          _id: {
            year: { $year: { date: '$date', timezone: 'Asia/Kolkata' } },
            month: { $month: { date: '$date', timezone: 'Asia/Kolkata' } },
            type: '$type',
          },
          totalCents: { $sum: '$amountCents' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Collapse into month map
    const trendMap = {};
    for (const e of monthlyTrend) {
      const key = `${e._id.year}-${String(e._id.month).padStart(2, '0')}`;
      if (!trendMap[key]) trendMap[key] = { key, label: `${MONTH_NAMES[e._id.month - 1]} ${e._id.year}`, income: 0, expense: 0 };
      trendMap[key][e._id.type] = e.totalCents;
    }
    const trend = Object.values(trendMap)
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((m) => ({
        month: m.label,
        income: m.income / 100,
        expense: m.expense / 100,
        savings: (m.income - m.expense) / 100,
      }));

    // ── 3. Category spending ────────────────────────────────────────────────
    const catSpend = await Transaction.aggregate([
      { $match: { ...baseMatch, type: 'expense', category: { $ne: null } } },
      { $group: { _id: '$category', totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } },
      { $sort: { totalCents: -1 } },
      { $limit: 12 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$cat.name', 'Uncategorised'] },
          icon: { $ifNull: ['$cat.icon', '📦'] },
          color: { $ifNull: ['$cat.color', '#94A3B8'] },
          amount: { $divide: ['$totalCents', 100] },
          cents: '$totalCents',
          count: 1,
          pct: tot.expense > 0 ? { $multiply: [{ $divide: ['$totalCents', tot.expense] }, 100] } : 0,
        },
      },
    ]);

    // ── 4. Category income breakdown ────────────────────────────────────────
    const catIncome = await Transaction.aggregate([
      { $match: { ...baseMatch, type: 'income', category: { $ne: null } } },
      { $group: { _id: '$category', totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } },
      { $sort: { totalCents: -1 } },
      { $limit: 8 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$cat.name', 'Uncategorised'] },
          icon: { $ifNull: ['$cat.icon', '💰'] },
          color: { $ifNull: ['$cat.color', '#10B981'] },
          amount: { $divide: ['$totalCents', 100] },
          cents: '$totalCents',
          count: 1,
        },
      },
    ]);

    // ── 5. FY comparison (always current FY vs previous FY) ─────────────────
    const now = new Date();
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear(); const m = ist.getUTCMonth();
    const fyStartYear = m >= 3 ? y : y - 1;
    const toIST = (yr, mo, d, h, mi, s, ms) =>
      new Date(Date.UTC(yr, mo, d, h, mi, s, ms) - IST_OFFSET_MS);

    const [fyCurrentStats, fyPrevStats] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: toIST(fyStartYear, 3, 1, 0, 0, 0, 0), $lte: toIST(fyStartYear + 1, 2, 31, 23, 59, 59, 999) } } },
        { $group: { _id: '$type', totalCents: { $sum: '$amountCents' } } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: toIST(fyStartYear - 1, 3, 1, 0, 0, 0, 0), $lte: toIST(fyStartYear, 2, 31, 23, 59, 59, 999) } } },
        { $group: { _id: '$type', totalCents: { $sum: '$amountCents' } } },
      ]),
    ]);

    const mapFY = (arr) => {
      const r = { income: 0, expense: 0 };
      for (const s of arr) { if (s._id === 'income') r.income = s.totalCents; if (s._id === 'expense') r.expense = s.totalCents; }
      return { income: r.income / 100, expense: r.expense / 100, savings: (r.income - r.expense) / 100 };
    };

    const fyComparison = [
      { fy: `FY ${fyStartYear - 1}-${String(fyStartYear).slice(2)}`, ...mapFY(fyPrevStats) },
      { fy: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`, ...mapFY(fyCurrentStats) },
    ];

    // ── 6. Day-of-week spending pattern ────────────────────────────────────
    const dowPattern = await Transaction.aggregate([
      { $match: { ...baseMatch, type: 'expense' } },
      {
        $group: {
          _id: { $dayOfWeek: { date: '$date', timezone: 'Asia/Kolkata' } }, // 1=Sun
          totalCents: { $sum: '$amountCents' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dowFull = Array.from({ length: 7 }, (_, i) => {
      const found = dowPattern.find((d) => d._id === i + 1);
      return { day: DOW[i], amount: found ? found.totalCents / 100 : 0, count: found ? found.count : 0 };
    });

    res.status(200).json({
      success: true,
      data: {
        period: { label: range.label, start: range.start, end: range.end },
        summary: {
          incomeCents: tot.income, income: tot.income / 100,
          expenseCents: tot.expense, expense: tot.expense / 100,
          savingsCents, savings: savingsCents / 100,
          savingsRate,
        },
        trend,
        categoryExpense: catSpend,
        categoryIncome: catIncome,
        fyComparison,
        dowPattern: dowFull,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  "Explain this" — sends compact summary to Gemini, not raw data
// @route POST /api/analytics/explain
exports.explainAnalytics = async (req, res, next) => {
  try {
    const { summary, period, topCategories } = req.body;

    // Validate required compact fields — never accept raw transactions
    if (!summary || typeof summary.income !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid summary payload' });
    }

    const { generateContent } = require('../services/aiService');
    const inr = (n) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;

    const prompt = `You are a friendly Indian personal finance advisor. Analyze this monthly financial summary and give 3-4 practical, concise insights in simple English. Keep it under 120 words. Do not repeat numbers already shown. Focus on patterns, habits, and actionable suggestions.

Period: ${period}
Income: ${inr(summary.income)}
Expenses: ${inr(summary.expense)}
Savings: ${inr(summary.savings)} (${summary.savingsRate}% savings rate)
Top expense categories: ${(topCategories || []).map((c) => `${c.name} ${inr(c.amount)}`).join(', ')}

Give insights as 3-4 short bullet points.`;

    const resultText = await generateContent(prompt);
    
    if (!resultText) throw new Error('AI generation failed');

    res.status(200).json({
      success: true,
      insight: resultText,
    });
  } catch (error) {
    // AI errors must not break the app
    res.status(200).json({
      success: false,
      insight: null,
      message: 'AI insight unavailable at this time.',
    });
  }
};
