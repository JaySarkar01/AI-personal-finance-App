const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    amountCents: { type: Number, required: [true, 'Amount is required'], min: [1, 'Amount must be positive'] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    frequency: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly' 
    },
    // Used for custom frequency (e.g. every 14 days)
    intervalDays: { type: Number, default: null },
    startDate: { type: Date, default: Date.now },
    nextPaymentDate: { type: Date, required: true },
    autoPay: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    color: { type: String, default: '#3B82F6' },
    icon: { type: String, default: '🔄' },
    notes: { type: String, maxlength: 300, default: '' },
    // Examples: rent, EMI, SIP, insurance, OTT, etc.
    type: { type: String, enum: ['subscription', 'bill', 'emi', 'sip', 'rent', 'other'], default: 'subscription' }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

subscriptionSchema.virtual('amount').get(function () { return this.amountCents / 100; });

module.exports = mongoose.model('Subscription', subscriptionSchema);
