const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  refreshTokenHash: {
    type: String,
    required: true
  },
  deviceName: String,
  ipAddress: String,
  userAgent: String,
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Compare refresh token
sessionSchema.methods.matchRefreshToken = async function(enteredToken) {
  return await bcrypt.compare(enteredToken, this.refreshTokenHash);
};

module.exports = mongoose.model('Session', sessionSchema);
