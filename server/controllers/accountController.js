const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

// @desc   Get all accounts for the authenticated user
// @route  GET /api/accounts
// @access Private
exports.getAccounts = async (req, res, next) => {
  try {
    const { includeArchived } = req.query;
    const filter = { user: req.user._id };
    if (!includeArchived || includeArchived === 'false') {
      filter.isArchived = false;
    }

    const accounts = await Account.find(filter).sort({ createdAt: 1 });
    res.status(200).json({ success: true, count: accounts.length, data: accounts });
  } catch (error) {
    next(error);
  }
};

// @desc   Get net worth summary
// @route  GET /api/accounts/summary
// @access Private
exports.getAccountSummary = async (req, res, next) => {
  try {
    const accounts = await Account.find({ user: req.user._id, isArchived: false });

    let totalAssetsCents = 0;
    let totalLiabilitiesCents = 0;

    const byType = {};
    for (const acc of accounts) {
      if (!acc.includeInTotal) continue;
      // Credit cards are liabilities (negative balance = debt)
      if (acc.type === 'Credit Card') {
        totalLiabilitiesCents += acc.balanceCents;
      } else {
        totalAssetsCents += acc.balanceCents;
      }
      byType[acc.type] = (byType[acc.type] || 0) + acc.balanceCents;
    }

    const netWorthCents = totalAssetsCents - totalLiabilitiesCents;

    res.status(200).json({
      success: true,
      data: {
        netWorthCents,
        netWorth: netWorthCents / 100,
        totalAssetsCents,
        totalAssets: totalAssetsCents / 100,
        totalLiabilitiesCents,
        totalLiabilities: totalLiabilitiesCents / 100,
        byType: Object.fromEntries(
          Object.entries(byType).map(([k, v]) => [k, { cents: v, amount: v / 100 }])
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single account
// @route  GET /api/accounts/:id
// @access Private
exports.getAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

// @desc   Create account
// @route  POST /api/accounts
// @access Private
exports.createAccount = async (req, res, next) => {
  try {
    const { name, type, initialBalance, currency, color, icon, includeInTotal, description } = req.body;

    // Convert initial balance (decimal) → integer cents safely
    const initialCents = initialBalance !== undefined
      ? Math.round(parseFloat(initialBalance) * 100)
      : 0;

    if (isNaN(initialCents)) {
      return res.status(400).json({ success: false, message: 'Invalid initial balance' });
    }

    const account = await Account.create({
      user: req.user._id,
      name,
      type,
      balanceCents: initialCents,
      currency: currency || 'INR',
      color: color || '#0D9488',
      icon: icon || '🏦',
      includeInTotal: includeInTotal !== false,
      description,
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

// @desc   Update account
// @route  PUT /api/accounts/:id
// @access Private
exports.updateAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const { name, type, color, icon, isArchived, includeInTotal, description } = req.body;
    if (name !== undefined) account.name = name;
    if (type !== undefined) account.type = type;
    if (color !== undefined) account.color = color;
    if (icon !== undefined) account.icon = icon;
    if (isArchived !== undefined) account.isArchived = isArchived;
    if (includeInTotal !== undefined) account.includeInTotal = includeInTotal;
    if (description !== undefined) account.description = description;

    await account.save();
    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

// @desc   Delete account
// @route  DELETE /api/accounts/:id
// @access Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Guard: check if account has transactions
    const txCount = await Transaction.countDocuments({ user: req.user._id, $or: [{ account: account._id }, { toAccount: account._id }] });
    const force = req.query.force === 'true';

    if (txCount > 0 && !force) {
      return res.status(409).json({
        success: false,
        message: `This account has ${txCount} transaction(s). Use ?force=true to delete it along with all its transactions.`,
        transactionCount: txCount,
      });
    }

    if (force && txCount > 0) {
      await Transaction.deleteMany({ user: req.user._id, $or: [{ account: account._id }, { toAccount: account._id }] });
    }

    await account.deleteOne();
    res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
};
