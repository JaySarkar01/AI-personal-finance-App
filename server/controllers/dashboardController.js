const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

/**
 * Returns the current Indian Financial Year boundaries (April 1 → March 31)
 * based on IST (Asia/Kolkata = UTC+5:30).
 */
const getIndianFY = (now = new Date()) => {
  // Offset IST: +5:30 = 330 minutes
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth(); // 0-based; March = 2, April = 3

  const fyStartYear = month >= 3 ? year : year - 1; // April = month 3
  const fyStart = new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0, 0) - IST_OFFSET_MS); // April 1 IST → UTC
  const fyEnd = new Date(Date.UTC(fyStartYear + 1, 2, 31, 23, 59, 59, 999) - IST_OFFSET_MS); // March 31 IST → UTC

  return { fyStart, fyEnd, fyStartYear, fyEndYear: fyStartYear + 1 };
};

/**
 * Current calendar month boundaries in IST.
 */
const getThisMonth = (now = new Date()) => {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - IST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999) - IST_OFFSET_MS);
  return { start, end };
};

// @desc   Get all dashboard data in one call
// @route  GET /api/dashboard
// @access Private
exports.getDashboard = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const now = new Date();
    const { fyStart, fyEnd, fyStartYear, fyEndYear } = getIndianFY(now);
    const { start: monthStart, end: monthEnd } = getThisMonth(now);

    // ── 1. Account summary (net worth) ──────────────────────────────────────
    const accounts = await Account.find({ user: userId, isArchived: false }).lean();
    let totalAssetsCents = 0;
    let totalLiabilitiesCents = 0;
    for (const acc of accounts) {
      if (!acc.includeInTotal) continue;
      if (acc.type === 'Credit Card') {
        totalLiabilitiesCents += acc.balanceCents;
      } else {
        totalAssetsCents += acc.balanceCents;
      }
    }
    const netWorthCents = totalAssetsCents - totalLiabilitiesCents;

    // ── 2. This-month stats ──────────────────────────────────────────────────
    const monthStats = await Transaction.aggregate([
      { $match: { user: userId, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$type', totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } },
    ]);
    const ms = { income: 0, expense: 0 };
    for (const s of monthStats) {
      if (s._id === 'income') ms.income = s.totalCents;
      if (s._id === 'expense') ms.expense = s.totalCents;
    }
    const savingsCents = ms.income - ms.expense;
    const savingsRate = ms.income > 0 ? Math.round((savingsCents / ms.income) * 10000) / 100 : 0;

    // ── 3. FY stats ─────────────────────────────────────────────────────────
    const fyStats = await Transaction.aggregate([
      { $match: { user: userId, date: { $gte: fyStart, $lte: fyEnd } } },
      { $group: { _id: '$type', totalCents: { $sum: '$amountCents' } } },
    ]);
    const fy = { income: 0, expense: 0 };
    for (const s of fyStats) {
      if (s._id === 'income') fy.income = s.totalCents;
      if (s._id === 'expense') fy.expense = s.totalCents;
    }

    // ── 4. Monthly cash flow — last 6 months ────────────────────────────────
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const cashFlow = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: { $in: ['income', 'expense'] },
          date: { $gte: sixMonthsAgo },
        },
      },
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

    // Build ordered month labels and data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const cashFlowMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      cashFlowMap[key] = { label: monthNames[d.getMonth()], income: 0, expense: 0 };
    }
    for (const entry of cashFlow) {
      const key = `${entry._id.year}-${entry._id.month}`;
      if (cashFlowMap[key]) {
        cashFlowMap[key][entry._id.type] = entry.totalCents;
      }
    }
    const cashFlowData = Object.values(cashFlowMap).map((m) => ({
      month: m.label,
      income: m.income / 100,
      expense: m.expense / 100,
      net: (m.income - m.expense) / 100,
    }));

    // ── 5. Spending by category (this month) ────────────────────────────────
    const categorySpend = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: monthStart, $lte: monthEnd },
          category: { $ne: null },
        },
      },
      { $group: { _id: '$category', totalCents: { $sum: '$amountCents' } } },
      { $sort: { totalCents: -1 } },
      { $limit: 8 },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'cat',
        },
      },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$cat.name', 'Uncategorised'] },
          icon: { $ifNull: ['$cat.icon', '📦'] },
          color: { $ifNull: ['$cat.color', '#94A3B8'] },
          amount: { $divide: ['$totalCents', 100] },
          cents: '$totalCents',
        },
      },
    ]);

    // ── 6. Recent transactions (last 5) ─────────────────────────────────────
    const recent = await Transaction.find({ user: userId })
      .sort({ date: -1 })
      .limit(5)
      .populate('account', 'name type color icon')
      .populate('category', 'name icon color')
      .lean();

    // Add virtual amount field
    const recentFormatted = recent.map((t) => ({ ...t, amount: t.amountCents / 100 }));

    res.status(200).json({
      success: true,
      data: {
        period: {
          month: monthNames[now.getMonth()],
          fy: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`,
        },
        netWorth: {
          cents: netWorthCents,
          amount: netWorthCents / 100,
          assetsCents: totalAssetsCents,
          liabilitiesCents: totalLiabilitiesCents,
        },
        thisMonth: {
          incomeCents: ms.income,
          income: ms.income / 100,
          expenseCents: ms.expense,
          expense: ms.expense / 100,
          savingsCents,
          savings: savingsCents / 100,
          savingsRate,
        },
        financialYear: {
          label: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}`,
          incomeCents: fy.income,
          income: fy.income / 100,
          expenseCents: fy.expense,
          expense: fy.expense / 100,
        },
        cashFlow: cashFlowData,
        categorySpend,
        recentTransactions: recentFormatted,
        accounts: accounts.map((a) => ({ ...a, balance: a.balanceCents / 100 })),
      },
    });
  } catch (error) {
    next(error);
  }
};
