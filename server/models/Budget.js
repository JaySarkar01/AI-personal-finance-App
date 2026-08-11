const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Budget name is required'], trim: true, maxlength: 80 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    // Budget limit stored as integer cents
    limitCents: { type: Number, required: [true, 'Budget limit is required'], min: [1, 'Limit must be positive'] },
    period: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    // Month/year this budget applies to (1-indexed month). Null = recurring every month
    month: { type: Number, min: 1, max: 12, default: null },
    year: { type: Number, default: null },
    color: { type: String, default: '#0D9488' },
    icon: { type: String, default: '📊' },
    isActive: { type: Boolean, default: true },
    notes: { type: String, maxlength: 200, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

budgetSchema.virtual('limit').get(function () {
  return this.limitCents / 100;
});

budgetSchema.index({ user: 1, category: 1, month: 1, year: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
