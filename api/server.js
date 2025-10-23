// /api/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Routes
const cartRoutes = require("../routes/cart.routes");
const productRoutes = require("../routes/product.routes");
const authRoutes = require("../routes/auth.routes");
const orderRoutes = require("../routes/order.routes");
const categoryRoutes = require("../routes/category.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static file handling (for uploads/images)
app.use('/uploads', express.static(path.join(__dirname, '../public/Images')));

// Default route
app.get('/', (req, res) => {
  res.json({ ok: true, message: '✅ API is running successfully!' });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/product', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// MongoDB connection
const { MONGO_URI } = process.env;
mongoose.connect(MONGO_URI, { autoIndex: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// 🚫 DO NOT use app.listen() here — Vercel will handle it automatically
module.exports = app;
