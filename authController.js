const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRES_DAYS, 10) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({ success: true, token, user: user.toSafeObject() });
};

// @route  POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { username, displayName, email, password } = req.body;

  if (!username || !displayName || !email || !password) {
    res.status(400);
    throw new Error('Please provide username, displayName, email and password');
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    res.status(409);
    throw new Error('A user with that email or username already exists');
  }

  const user = await User.create({ username, displayName, email, password });
  sendTokenResponse(user, 201, res);
});

// @route  POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  sendTokenResponse(user, 200, res);
});

// @route  POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 1000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Logged out' });
});

// @route  GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toSafeObject() });
});

module.exports = { register, login, logout, getMe };
