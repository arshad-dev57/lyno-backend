// controllers/auth.controller.js
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const signToken = (userId) => {
  return jwt.sign(
    { sub: userId.toString() },              // keep using `sub`
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name = '', email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ ok: false, message: 'Email and password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ ok: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id);

    res.status(201).json({ ok: true, token, user });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ ok: false, message: 'Email and password are required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ ok: false, message: 'Invalid credentials' });

    const token = signToken(user._id);
    // strip password
    const safeUser = user.toObject();
    delete safeUser.password;

    res.json({ ok: true, token, user: safeUser });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};

exports.getallusers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ ok: true, users });
  } catch (err) {
    console.error('getallusers error:', err);
    res.status(500).json({ ok: false, message: 'Server error', error: err.message });
  }
};