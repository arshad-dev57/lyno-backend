// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// ❗ NON-EXPIRING TOKEN (no expiresIn)
const signToken = (userId) => {
  return jwt.sign(
    { sub: userId.toString() },
    process.env.JWT_SECRET
    // no expiresIn -> token won't expire
  );
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name = '', email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ ok: false, message: 'Email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res
        .status(409)
        .json({ ok: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);

    res.status(201).json({ ok: true, token, user });
  } catch (err) {
    console.error('register error:', err);
    res
      .status(500)
      .json({ ok: false, message: 'Server error', error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ ok: false, message: 'Email and password are required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user)
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    const token = signToken(user._id);
    const safeUser = user.toObject();
    delete safeUser.password;

    // If you use cookies, you can also set it here:
    // res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });

    res.json({ ok: true, token, user: safeUser });
  } catch (err) {
    console.error('login error:', err);
    res
      .status(500)
      .json({ ok: false, message: 'Server error', error: err.message });
  }
};

// GET /api/auth/users
exports.getallusers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ ok: true, users });
  } catch (err) {
    console.error('getallusers error:', err);
    res
      .status(500)
      .json({ ok: false, message: 'Server error', error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.sub;
    if (!userId) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'User not found' });
    }

    return res.status(200).json({
      ok: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error('me error:', err);
    res
      .status(500)
      .json({ ok: false, message: 'Server error', error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.cookies?.token) {
      res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
    return res.json({ ok: true, message: 'Logged out' });
  } catch (err) {
    console.error('logout error:', err);
    res
      .status(500)
      .json({ ok: false, message: 'Server error', error: err.message });
  }
};
