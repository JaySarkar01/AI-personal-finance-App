const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');

/**
 * Apply a balance change to an account using integer-cents arithmetic.
 * type: 'income' → add to account
 * type: 'expense' → subtract from account
 * type: 'transfer' → subtract from source, add to dest
 */
const applyBalanceChange = async (session, transaction, direction) => {
  const sign = direction === 'reverse' ? -1 : 1;

  if (transaction.type === 'income') {
    await Account.findByIdAndUpdate(
      transaction.account,
      { $inc: { balanceCents: sign * transaction.amountCents } },
      { session }
    );
  } else if (transaction.type === 'expense') {
    await Account.findByIdAndUpdate(
      transaction.account,
      { $inc: { balanceCents: -sign * transaction.amountCents } },
      { session }
    );
  } else if (transaction.type === 'transfer') {
    await Account.findByIdAndUpdate(
      transaction.account,
      { $inc: { balanceCents: -sign * transaction.amountCents } },
      { session }
    );
    await Account.findByIdAndUpdate(
      transaction.toAccount,
      { $inc: { balanceCents: sign * transaction.amountCents } },
      { session }
    );
  }
};

// @desc   Get transactions with filtering, sorting, and pagination
// @route  GET /api/transactions
// @access Private
exports.getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      accountId,
      categoryId,
      startDate,
      endDate,
      search,
      sortBy = 'date',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const filter = { user: req.user._id };

    // Type filter
    if (type && ['income', 'expense', 'transfer'].includes(type)) {
      filter.type = type;
    }

    // Account filter
    if (accountId) {
      filter.$or = [{ account: accountId }, { toAccount: accountId }];
    }

    // Category filter
    if (categoryId) {
      filter.category = categoryId;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    // Search filter (case-insensitive on description)
    if (search && search.trim()) {
      filter.description = { $regex: search.trim(), $options: 'i' };
    }

    // Sort
    const allowedSortFields = { date: 'date', amount: 'amountCents', description: 'description' };
    const sortField = allowedSortFields[sortBy] || 'date';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('account', 'name type color icon')
        .populate('toAccount', 'name type color icon')
        .populate('category', 'name icon color type')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Transaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc   Get transaction stats (income/expense totals)
// @route  GET /api/transactions/stats
// @access Private
exports.getTransactionStats = async (req, res, next) => {
  try {
    const { startDate, endDate, accountId } = req.query;

    const match = { user: new mongoose.Types.ObjectId(req.user._id) };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.date.$lte = end;
      }
    }
    if (accountId) {
      match.$or = [
        { account: new mongoose.Types.ObjectId(accountId) },
        { toAccount: new mongoose.Types.ObjectId(accountId) },
      ];
    }

    const stats = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          totalCents: { $sum: '$amountCents' },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = { income: { cents: 0, amount: 0, count: 0 }, expense: { cents: 0, amount: 0, count: 0 }, transfer: { cents: 0, amount: 0, count: 0 } };
    for (const s of stats) {
      result[s._id] = { cents: s.totalCents, amount: s.totalCents / 100, count: s.count };
    }

    const netCents = result.income.cents - result.expense.cents;
    result.net = { cents: netCents, amount: netCents / 100 };

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc   Get single transaction
// @route  GET /api/transactions/:id
// @access Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id })
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon')
      .populate('category', 'name icon color type');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// @desc   Create new transaction
// @route  POST /api/transactions
// @access Private
exports.createTransaction = async (req, res, next) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const { accountId, toAccountId, categoryId, type, amount, date, description, notes, tags, isRecurring, recurringInterval } = req.body;
    const userId = req.user._id;

    let finalCategory = categoryId || null;

    // Phase 10: Smart Categorization
    if (!finalCategory && type === 'expense' && description) {
      const { predictCategory } = require('../services/categorizationService');
      finalCategory = await predictCategory(userId, description);
    }

    if (finalCategory) {
      const cat = await Category.findOne({ _id: finalCategory, $or: [{ user: userId }, { isSystem: true }] }).session(dbSession);
      if (!cat) {
        await dbSession.abortTransaction();
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await dbSession.abortTransaction();
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }
    const amountCents = Math.round(parsedAmount * 100);

    // Verify account ownership
    const account = await Account.findOne({ _id: accountId, user: userId }).session(dbSession);
    if (!account) {
      await dbSession.abortTransaction();
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Verify destination account for transfers
    if (type === 'transfer') {
      if (!toAccountId) {
        await dbSession.abortTransaction();
        return res.status(400).json({ success: false, message: 'Destination account required for transfer' });
      }
      const toAccount = await Account.findOne({ _id: toAccountId, user: req.user._id }).session(dbSession);
      if (!toAccount) {
        await dbSession.abortTransaction();
        return res.status(404).json({ success: false, message: 'Destination account not found' });
      }
    }

    const [transaction] = await Transaction.create([{
      user: req.user._id,
      account: accountId,
      toAccount: type === 'transfer' ? toAccountId : null,
      category: type === 'expense' ? finalCategory : (categoryId || null),
      type,
      amountCents,
      date: date ? new Date(date) : new Date(),
      description,
      notes,
      tags: tags || [],
      isRecurring: isRecurring || false,
      recurringInterval: recurringInterval || null,
    }], { session: dbSession });

    // Update account balance(s)
    await applyBalanceChange(dbSession, transaction, 'apply');

    await dbSession.commitTransaction();

    const populated = await Transaction.findById(transaction._id)
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon')
      .populate('category', 'name icon color type');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    await dbSession.abortTransaction();
    next(error);
  } finally {
    dbSession.endSession();
  }
};

// @desc   Update transaction
// @route  PUT /api/transactions/:id
// @access Private
exports.updateTransaction = async (req, res, next) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    const { id } = req.params;
    const { accountId, toAccountId, categoryId, type, amount, date, description, notes, tags } = req.body;
    const userId = req.user._id;

    const oldTransaction = await Transaction.findOne({ _id: id, user: userId }).session(dbSession);
    if (!oldTransaction) {
      await dbSession.abortTransaction();
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Phase 10: Learn User Correction (if user manually assigned a new category)
    if (categoryId && categoryId.toString() !== (oldTransaction.category?.toString() || '')) {
      const { learnUserCorrection } = require('../services/categorizationService');
      await learnUserCorrection(userId, description || oldTransaction.description, categoryId);
    }

    // Reverse the old balance effect
    await applyBalanceChange(dbSession, oldTransaction, 'reverse');

    // Verify ownership of updated fields
    if (accountId !== undefined) {
      const acc = await Account.findOne({ _id: accountId, user: userId }).session(dbSession);
      if (!acc) {
        await dbSession.abortTransaction();
        return res.status(404).json({ success: false, message: 'Account not found' });
      }
    }
    
    if (toAccountId !== undefined && toAccountId !== null) {
      const toAcc = await Account.findOne({ _id: toAccountId, user: userId }).session(dbSession);
      if (!toAcc) {
        await dbSession.abortTransaction();
        return res.status(404).json({ success: false, message: 'Destination account not found' });
      }
    }
    
    if (categoryId !== undefined && categoryId !== null) {
      const cat = await Category.findOne({ _id: categoryId, $or: [{ user: userId }, { isSystem: true }] }).session(dbSession);
      if (!cat) {
        await dbSession.abortTransaction();
        return res.status(404).json({ success: false, message: 'Category not found' });
      }
    }

    // Apply updates
    if (amount !== undefined) {
      const parsed = parseFloat(amount);
      if (isNaN(parsed) || parsed <= 0) {
        await dbSession.abortTransaction();
        return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
      }
      oldTransaction.amountCents = Math.round(parsed * 100);
    }
    if (accountId !== undefined) oldTransaction.account = accountId;
    if (toAccountId !== undefined) oldTransaction.toAccount = toAccountId || null;
    if (categoryId !== undefined) oldTransaction.category = categoryId || null;
    if (type !== undefined) oldTransaction.type = type;
    if (date !== undefined) oldTransaction.date = new Date(date);
    if (description !== undefined) oldTransaction.description = description;
    if (notes !== undefined) oldTransaction.notes = notes;
    if (tags !== undefined) oldTransaction.tags = tags;

    // Apply the new balance effect
    await applyBalanceChange(dbSession, oldTransaction, 'forward');

    await oldTransaction.save({ session: dbSession });
    await dbSession.commitTransaction();

    const populated = await Transaction.findById(oldTransaction._id)
      .populate('account', 'name type color icon')
      .populate('toAccount', 'name type color icon')
      .populate('category', 'name icon color type');

    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    await dbSession.abortTransaction();
    next(error);
  } finally {
    dbSession.endSession();
  }
};

// @desc   Delete transaction (reverses balance impact)
// @route  DELETE /api/transactions/:id
// @access Private
exports.deleteTransaction = async (req, res, next) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id }).session(dbSession);
    if (!transaction) {
      await dbSession.abortTransaction();
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Reverse balance before deleting
    await applyBalanceChange(dbSession, transaction, 'reverse');
    await transaction.deleteOne({ session: dbSession });

    await dbSession.commitTransaction();
    res.status(200).json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    await dbSession.abortTransaction();
    next(error);
  } finally {
    dbSession.endSession();
  }
};
