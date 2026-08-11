const mongoose = require('mongoose');

const ACCOUNT_TYPES = ['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Net Banking', 'NEFT', 'RTGS', 'IMPS', 'Wallet', 'Cheque', 'Auto Debit', 'EMI', 'Bank', 'Savings', 'Investment', 'Other'];

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [60, 'Account name cannot exceed 60 characters'],
  },
  type: {
    type: String,
    required: [true, 'Account type is required'],
    enum: {
      values: ACCOUNT_TYPES,
      message: `Account type must be one of: ${ACCOUNT_TYPES.join(', ')}`,
    },
  },
  // Store balance as integer cents to avoid floating-point errors
  // e.g. $12.50 is stored as 1250
  balanceCents: {
    type: Number,
    default: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Balance must be stored as integer cents',
    },
  },
  currency: {
    type: String,
    default: 'INR',
    maxlength: [3, 'Currency code must be 3 characters'],
    uppercase: true,
  },
  color: {
    type: String,
    default: '#0D9488',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color'],
  },
  icon: {
    type: String,
    default: '🏦',
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  includeInTotal: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters'],
    trim: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: balance in major currency units (e.g. rupees/dollars)
accountSchema.virtual('balance').get(function () {
  return this.balanceCents / 100;
});

module.exports = mongoose.model('Account', accountSchema);
module.exports.ACCOUNT_TYPES = ACCOUNT_TYPES;
