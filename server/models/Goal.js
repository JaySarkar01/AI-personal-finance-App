const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Goal name is required'], trim: true, maxlength: 100 },
    targetCents: { type: Number, required: [true, 'Target amount is required'], min: [1, 'Target must be positive'] },
    currentCents: { type: Number, default: 0, min: 0 },
    // Optional: linked account whose balance tracks this goal
    linkedAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    deadline: { type: Date, default: null },
    icon: { type: String, default: '🎯' },
    color: { type: String, default: '#8B5CF6' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    isCompleted: { type: Boolean, default: false },
    notes: { type: String, maxlength: 300, default: '' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

goalSchema.virtual('target').get(function () { return this.targetCents / 100; });
goalSchema.virtual('current').get(function () { return this.currentCents / 100; });
goalSchema.virtual('remaining').get(function () { return Math.max(0, (this.targetCents - this.currentCents)) / 100; });
goalSchema.virtual('progressPct').get(function () {
  if (!this.targetCents) return 0;
  return Math.min(100, Math.round((this.currentCents / this.targetCents) * 10000) / 100);
});

module.exports = mongoose.model('Goal', goalSchema);
