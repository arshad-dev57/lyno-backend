// controllers/favorites.controller.js
const mongoose = require('mongoose');
const Favorite = require('../models/Favorite.model');
const Product = require('../models/Product.model');

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);


exports.addFavorite = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.sub;
    const { productId } = req.body;

    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    if (!productId || !isValidObjectId(productId))
      return res.status(400).json({ ok: false, message: 'Invalid productId' });

    // ensure product exists
    const exists = await Product.exists({ _id: productId });
    if (!exists) return res.status(404).json({ ok: false, message: 'Product not found' });

    // upsert favorite
    const fav = await Favorite.findOneAndUpdate(
      { user: userId, product: productId },
      { $setOnInsert: { user: userId, product: productId } },
      { new: true, upsert: true }
    );

    return res.status(201).json({ ok: true, favorite: fav });
  } catch (e) {
    // duplicate (E11000) handled here too if race condition
    return res.status(400).json({ ok: false, message: e.message });
  }
};

/**
 * DELETE /api/favorites/:productId
 */
exports.removeFavorite = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.sub;
    const { productId } = req.params;

    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    if (!productId || !isValidObjectId(productId))
      return res.status(400).json({ ok: false, message: 'Invalid productId' });

    await Favorite.deleteOne({ user: userId, product: productId });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e.message });
  }
};

/**
 * POST /api/favorites/toggle
 * body: { productId }
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.sub;
    const { productId } = req.body;

    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    if (!productId || !isValidObjectId(productId))
      return res.status(400).json({ ok: false, message: 'Invalid productId' });

    const exists = await Favorite.findOne({ user: userId, product: productId }).lean();
    if (exists) {
      await Favorite.deleteOne({ _id: exists._id });
      return res.json({ ok: true, favorited: false });
    }

    // ensure product exists before add
    const prod = await Product.exists({ _id: productId });
    if (!prod) return res.status(404).json({ ok: false, message: 'Product not found' });

    await Favorite.create({ user: userId, product: productId });
    return res.json({ ok: true, favorited: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e.message });
  }
};


exports.listFavorites = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.sub;
    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Favorite.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'product',
          select: 'title price images slug inStock ratingAvg ratingCount', 
        })
        .lean(),
      Favorite.countDocuments({ user: userId }),
    ]);

    const products = items
      .map((f) => f.product)
      .filter(Boolean);

    return res.json({ ok: true, data: products, page, limit, total });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
};


exports.isFavorited = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.sub;
    const { productId } = req.params;
    if (!userId) return res.status(401).json({ ok: false, message: 'Unauthorized' });
    if (!productId || !isValidObjectId(productId))
      return res.status(400).json({ ok: false, message: 'Invalid productId' });

    const exists = await Favorite.exists({ user: userId, product: productId });
    return res.json({ ok: true, favorited: !!exists });
  } catch (e) {
    return res.status(400).json({ ok: false, message: e.message });
  }
};
