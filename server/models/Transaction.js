const mongoose = require('mongoose');

const TRANSACTION_TYPES = ['income', 'expense', 'transfer'];

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Account is required'],
  },
  // Only used for transfer type
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: TRANSACTION_TYPES,
      message: `Transaction type must be one of: ${TRANSACTION_TYPES.join(', ')}`,
    },
  },
  // Stored as integer cents — always positive
  // e.g. ₹150.00 stored as 15000
  amountCents: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be greater than 0'],
    validate: {
      validator: Number.isInteger,
      message: 'Amount must be stored as integer cents',
    },
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters'],
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: (arr) => arr.length <= 10,
      message: 'Cannot have more than 10 tags',
    },
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringInterval: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly', null],
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for fast date-range and account queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, account: 1, date: -1 });
transactionSchema.index({ user: 1, category: 1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });

// Virtual: amount in major units
transactionSchema.virtual('amount').get(function () {
  return this.amountCents / 100;
});

// Custom validation: transfer requires toAccount
transactionSchema.pre('validate', function () {
  if (this.type === 'transfer' && !this.toAccount) {
    this.invalidate('toAccount', 'Transfer transactions require a destination account');
  }
  if (this.type === 'transfer' && this.toAccount && this.toAccount.toString() === this.account.toString()) {
    this.invalidate('toAccount', 'Source and destination account cannot be the same');
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
