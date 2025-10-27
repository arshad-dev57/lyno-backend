require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const cartRoutes = require("./routes/cart.routes");
const productRoutes = require("./routes/product.routes");
const authRoutes = require("./routes/auth.routes");
const orderRoutes = require("./routes/order.routes");
const categoryRoutes = require("./routes/category.routes");
const favoritesRoutes = require("./routes/favorites.routes");
const app = express();

app.use(cors({
  origin: '*', // Allow all origins (for testing)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// ================= Static Files =================
app.use('/uploads', express.static(path.join(__dirname, '../public/Images')));

// ================= Health Check =================
app.get('/api/health', (_req, res) => res.json({ ok: true, where: 'health' }));
app.get('/', (_req, res) => res.json({ ok: true, message: '✅ API is running successfully!' }));

// ================= Routes =================
app.use('/api/auth', authRoutes);
app.use('/api/category', categoryRoutes);
app.use('/api/product', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoritesRoutes);

// ================= MongoDB Connection =================
const { MONGO_URI } = process.env;

const dbConnection = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
  }
};
dbConnection();

// ================= Start Server =================
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running locally at: http://localhost:${PORT}`);
  console.log('🌐 Access from mobile using your PC IP:');
  console.log(`👉 Example: http://192.168.X.X:${PORT}`);
});

module.exports = app;
