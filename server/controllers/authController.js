const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

// Helper: Generate Access Token (Short-lived)
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

// Helper: Create Session & Refresh Token
const createSession = async (userId, req) => {
  const tokenBytes = crypto.randomBytes(40).toString('hex');
  const salt = await bcrypt.genSalt(10);
  const refreshTokenHash = await bcrypt.hash(tokenBytes, salt);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
  
  const session = await Session.create({
    user: userId,
    refreshTokenHash,
    deviceName: req.headers['user-agent'] || 'Unknown Device',
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    expiresAt
  });
  
  return `${session._id}:${tokenBytes}`;
};

// Set refresh token cookie
const setRefreshTokenCookie = (res, refreshToken) => {
  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };
  res.cookie('refreshToken', refreshToken, options);
};

// @desc    Register user
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ success: false, message: 'Email already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = await createSession(user._id, req);
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({ success: true, data: { id: user._id, name: user.name, email: user.email, accessToken } });
  } catch (error) { next(error); }
};

// @desc    Login user
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = await createSession(user._id, req);
    setRefreshTokenCookie(res, refreshToken);

    res.status(200).json({ success: true, data: { id: user._id, name: user.name, email: user.email, accessToken } });
  } catch (error) { next(error); }
};

// @desc    Refresh access token
exports.refresh = async (req, res, next) => {
  try {
    const tokenParts = req.cookies.refreshToken ? req.cookies.refreshToken.split(':') : [];
    if (tokenParts.length !== 2) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    
    const [sessionId, tokenBytes] = tokenParts;
    const session = await Session.findById(sessionId);
    
    if (!session || session.expiresAt < new Date()) {
      if (session) await session.deleteOne();
      return res.status(401).json({ success: false, message: 'Session expired or invalid' });
    }

    if (!(await session.matchRefreshToken(tokenBytes))) {
      await session.deleteOne(); // Potential token theft, delete session
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Rotate session: Issue new access & refresh token, delete old session
    const accessToken = generateAccessToken(session.user);
    const newRefreshToken = await createSession(session.user, req);
    setRefreshTokenCookie(res, newRefreshToken);
    await session.deleteOne();

    res.status(200).json({ success: true, accessToken });
  } catch (error) { next(error); }
};

// @desc    Logout (delete current session)
exports.logout = async (req, res, next) => {
  try {
    const tokenParts = req.cookies.refreshToken ? req.cookies.refreshToken.split(':') : [];
    if (tokenParts.length === 2) {
      await Session.findByIdAndDelete(tokenParts[0]);
    }
    res.cookie('refreshToken', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

// @desc    Get current user
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
  } catch (error) { next(error); }
};

// @desc    Get all active sessions
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ user: req.user.id }).select('-refreshTokenHash');
    res.status(200).json({ success: true, data: sessions });
  } catch (error) { next(error); }
};

// @desc    Logout all devices (delete all user sessions)
exports.logoutAll = async (req, res, next) => {
  try {
    await Session.deleteMany({ user: req.user.id });
    res.cookie('refreshToken', 'none', { expires: new Date(Date.now() + 10 * 1000), httpOnly: true });
    res.status(200).json({ success: true, message: 'Logged out from all devices' });
  } catch (error) { next(error); }
};

// @desc    Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    console.log(`\n\n[DEV] Password reset link generated: ${process.env.CLIENT_URL}/reset-password?token=${resetToken}\n\n`);

    res.status(200).json({ success: true, message: 'Password reset link sent to email (check console during dev)' });
  } catch (error) { next(error); }
};

// @desc    Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    // Invalidate all sessions to force login with new password
    await Session.deleteMany({ user: user._id });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) { next(error); }
};
