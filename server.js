require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Routes
const cartRoutes = require("./routes/cart.routes");
const productRoutes = require("./routes/product.routes");
const authRoutes = require("./routes/auth.routes");
const orderRoutes = require("./routes/order.routes");
const categoryRoutes = require("./routes/category.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static for uploads (optional)
app.use('/uploads', express.static(path.join(__dirname, '../public/Images')));

// Quick health checks
app.get('/api/health', (_req, res) => res.json({ ok: true, where: 'health' }));
app.get('/', (_req, res) => res.json({ ok: true, message: '✅ API is running successfully!' }));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/product', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// MongoDB
const { MONGO_URI } = process.env;
mongoose.connect(MONGO_URI, { autoIndex: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Vercel: export app (no app.listen)
module.exports = app;
