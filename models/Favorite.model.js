// models/Favorite.model.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  },
  { timestamps: true }
);

// user + product must be unique (ek product ko ek user sirf 1 dafa favorite kar sakta hai)
favoriteSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
