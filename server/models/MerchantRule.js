const mongoose = require('mongoose');

const merchantRuleSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null means global/system rule
    index: true,
  },
  pattern: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  priority: {
    type: Number,
    required: true,
    // 1: User Correction/Override
    // 2: Global Merchant Rule
    // 3: Cached AI Classification
  }
}, { timestamps: true });

merchantRuleSchema.index({ user: 1, pattern: 1 });

module.exports = mongoose.model('MerchantRule', merchantRuleSchema);
