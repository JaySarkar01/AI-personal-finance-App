const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { generateContent } = require('../services/aiService');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const toIST = (utcYear, utcMonth, day, h, min, s, ms) =>
  new Date(Date.UTC(utcYear, utcMonth, day, h, min, s, ms) - IST_OFFSET_MS);

/**
 * Calculates standard deviation
 */
const getStandardDeviation = (array) => {
  const n = array.length;
  const mean = array.reduce((a, b) => a + b) / n;
  return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
};

// @desc   Get intelligence metrics deterministically
// @route  GET /api/intelligence
// @access Private
exports.getIntelligence = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const now = new Date();
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const y = ist.getUTCFullYear();
    const m = ist.getUTCMonth(); // 0-based, current month

    // Range for last 6 full months (not including current month)
    const sixMonthsAgo = toIST(y, m - 6, 1, 0, 0, 0, 0);
    // Include current month for anomalies/leaks
    const endOfCurrentMonth = toIST(y, m + 1, 0, 23, 59, 59, 999);

    const matchCriteria = {
      user: userId,
      date: { $gte: sixMonthsAgo, $lte: endOfCurrentMonth }
    };

    // 1. Fetch 7-month data by Category and Month
    const monthlyCategorySpend = await Transaction.aggregate([
      { $match: { ...matchCriteria, type: 'expense' } },
      {
        $group: {
          _id: {
            category: '$category',
            year: { $year: { date: '$date', timezone: '+05:30' } },
            month: { $month: { date: '$date', timezone: '+05:30' } }
          },
          totalCents: { $sum: '$amountCents' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } }
    ]);

    // Format data into timeseries per category
    const categoryHistory = {}; // { categoryId: { name, data: [month0...month6] } }
    
    // Initialize standard array of length 7
    monthlyCategorySpend.forEach(doc => {
      const catId = doc._id.category ? doc._id.category.toString() : 'uncategorized';
      const catName = doc.categoryInfo ? doc.categoryInfo.name : 'Uncategorized';
      const amount = doc.totalCents / 100;
      
      const docDate = new Date(doc._id.year, doc._id.month - 1, 1);
      const diffMonths = (y - docDate.getFullYear()) * 12 + (m - docDate.getMonth());
      const idx = 6 - diffMonths; // 6 is current month, 0 is 6 months ago

      if (idx >= 0 && idx <= 6) {
        if (!categoryHistory[catId]) {
          categoryHistory[catId] = { name: catName, data: [0,0,0,0,0,0,0] };
        }
        categoryHistory[catId].data[idx] += amount;
      }
    });

    const anomalies = [];
    const leaks = [];

    // Analyze each category
    for (const catId in categoryHistory) {
      const hist = categoryHistory[catId];
      const past6 = hist.data.slice(0, 6); // past 6 months
      const current = hist.data[6]; // current month

      // If no past data, skip
      if (past6.reduce((a, b) => a + b, 0) === 0) continue;

      const mean = past6.reduce((a, b) => a + b, 0) / 6;
      const stdDev = getStandardDeviation(past6);

      // Anomaly detection: Current month > Mean + 2 Sigma
      const threshold = mean + (2 * stdDev);
      if (current > threshold && current > 500) { // arbitrary 500 INR minimum to reduce noise
        anomalies.push({
          category: hist.name,
          current,
          average: mean,
          deviation: current - mean
        });
      }

      // Money Leak detection: Monotonic increase over last 3+ months
      // Check indices 4, 5, 6 (last 2 full months + current) or 3, 4, 5
      let isLeak = false;
      let leakMonths = 0;
      for (let i = 6; i >= 1; i--) {
        if (hist.data[i] > hist.data[i-1] && hist.data[i] > 100) {
          leakMonths++;
        } else {
          break;
        }
      }
      if (leakMonths >= 3) {
        leaks.push({
          category: hist.name,
          monthsIncreasing: leakMonths + 1,
          current,
          history: hist.data.slice(6 - leakMonths, 7).map(v => Math.round(v))
        });
      }
    }

    // 2. Cashflow Forecasting & Health Score Prep
    const generalMonthly = await Transaction.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: {
            type: '$type',
            year: { $year: { date: '$date', timezone: '+05:30' } },
            month: { $month: { date: '$date', timezone: '+05:30' } }
          },
          total: { $sum: '$amountCents' }
        }
      }
    ]);

    let pastIncome = 0;
    let pastExpense = 0;
    let currentIncome = 0;
    let currentExpense = 0;

    generalMonthly.forEach(doc => {
      const docDate = new Date(doc._id.year, doc._id.month - 1, 1);
      const diff = (y - docDate.getFullYear()) * 12 + (m - docDate.getMonth());
      const amount = doc.total / 100;

      if (diff === 0) {
        if (doc._id.type === 'income') currentIncome += amount;
        if (doc._id.type === 'expense') currentExpense += amount;
      } else if (diff > 0 && diff <= 3) {
        // Use last 3 months for projection
        if (doc._id.type === 'income') pastIncome += amount;
        if (doc._id.type === 'expense') pastExpense += amount;
      }
    });

    const forecastIncome = Math.round(pastIncome / 3);
    const forecastExpense = Math.round(pastExpense / 3);
    const forecastSavings = forecastIncome - forecastExpense;

    // 3. Health Score Calculation (0-100)
    // - Savings Rate (30 pts max for >20% savings)
    const currentSavingsRate = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;
    const savingsScore = Math.min(30, Math.max(0, (currentSavingsRate / 20) * 30));

    // - Liquidity / Emergency Fund (40 pts max for >3 months expenses)
    const accounts = await Account.find({ user: userId, type: { $in: ['savings', 'bank', 'cash', 'wallet'] } });
    const liquidCents = accounts.reduce((acc, a) => acc + a.balanceCents, 0);
    const liquidCash = liquidCents / 100;
    const monthsOfRunway = forecastExpense > 0 ? (liquidCash / forecastExpense) : 0;
    const liquidityScore = Math.min(40, Math.max(0, (monthsOfRunway / 3) * 40));

    // - Anomaly/Leak Penalty (Base 30 pts, minus 5 for each leak/anomaly)
    const penalty = (anomalies.length * 5) + (leaks.length * 5);
    const disciplineScore = Math.max(0, 30 - penalty);

    const healthScore = Math.round(savingsScore + liquidityScore + disciplineScore);

    res.status(200).json({
      success: true,
      data: {
        healthScore,
        metrics: {
          savingsScore: Math.round(savingsScore),
          liquidityScore: Math.round(liquidityScore),
          disciplineScore: Math.round(disciplineScore)
        },
        forecast: {
          nextMonthIncome: forecastIncome,
          nextMonthExpense: forecastExpense,
          nextMonthSavings: forecastSavings
        },
        anomalies,
        leaks
      }
    });

  } catch (error) {
    next(error);
  }
};

// @desc   Ask AI to explain the intelligence findings
// @route  POST /api/intelligence/explain
// @access Private
exports.explainIntelligence = async (req, res, next) => {
  try {
    const { healthScore, anomalies, leaks, forecast } = req.body;

    // Build a compact representation
    const inr = (n) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
    
    let anomaliesStr = (anomalies || []).map(a => `${a.category}: ${inr(a.current)} (avg ${inr(a.average)})`).join(', ') || 'None';
    let leaksStr = (leaks || []).map(l => `${l.category} rising for ${l.monthsIncreasing} months`).join(', ') || 'None';

    const prompt = `You are an expert Indian personal finance advisor. Explain this deterministic financial intelligence report in 3-4 concise bullet points. Provide practical optimization tips.

Health Score: ${healthScore}/100
Forecasted Cash Flow: In ${inr(forecast.nextMonthIncome)} | Out ${inr(forecast.nextMonthExpense)}
Anomalies: ${anomaliesStr}
Money Leaks (Trending Up): ${leaksStr}

Keep it educational and actionable. Max 120 words.`;

    const resultText = await generateContent(prompt);
    
    if (!resultText) throw new Error('AI generation failed');

    res.status(200).json({
      success: true,
      insight: resultText,
    });
  } catch (error) {
    res.status(200).json({ success: false, message: 'AI insight unavailable right now' });
  }
};
