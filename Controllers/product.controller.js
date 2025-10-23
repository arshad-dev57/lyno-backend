// controllers/product.controller.js
const mongoose = require("mongoose");
const Product = require("../models/Product.model");
const Category = require("../models/Category.model");

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

async function resolveCategoryId({ category, categorySlug }) {
  if (category && isValidObjectId(category)) return category;
  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug, isActive: true }).select("_id");
    if (!cat) throw new Error("Category (by slug) not found");
    return cat._id;
  }
  throw new Error("Provide 'category' (ObjectId) or 'categorySlug'");
}

exports.createProduct = async (req, res) => {
  try {
    const {
      title, sku, brand, shortDescription, description,
      images = [], price, stockQty = 0, minOrderQty = 1, maxOrderQty = 0,
      attributes = [], tags = [], seoTitle, seoDescription, order = 0,
      // category binding options
      category, categorySlug, categories = [],
    } = req.body;

    const primaryCatId = await resolveCategoryId({ category, categorySlug });

    let categoriesIds = [];
    if (Array.isArray(categories) && categories.length) {
      // filter valid ObjectIds only
      categoriesIds = categories.filter(isValidObjectId);
    }

    const payload = {
      title, sku, brand, shortDescription, description, images,
      price, stockQty, minOrderQty, maxOrderQty, attributes, tags,
      seoTitle, seoDescription, order,
      category: primaryCatId,
      categories: categoriesIds.includes(primaryCatId) ? categoriesIds : [primaryCatId, ...categoriesIds],
    };

    const created = await Product.create(payload);
    return res.status(201).json({ success: true, data: created });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

/* ------------------------------- READ (LIST) ------------------------------- */
// filters: ?q=search&category=<id|slug>&min=0&max=999&inStock=true&activeOnly=true&sort=price.asc|price.desc|new|pop&page=1&limit=20
exports.getProducts = async (req, res) => {
  try {
    const {
      q, category, categorySlug, min, max, inStock, activeOnly,
      sort = "new", page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (activeOnly === "true") filter.isActive = true;

    // category filter
    if (category || categorySlug) {
      const catId = await resolveCategoryId({ category, categorySlug }).catch(() => null);
      if (catId) filter.categories = catId; // match any in categories array
    }

    // price filter (on sale price)
    const priceFilter = {};
    if (min != null) priceFilter.$gte = Number(min);
    if (max != null) priceFilter.$lte = Number(max);
    if (Object.keys(priceFilter).length) filter["price.sale"] = priceFilter;

    // stock filter
    if (inStock === "true") filter.inStock = true;

    // search
    if (q) filter.$text = { $search: q };

    // pagination
    const _page = Math.max(1, parseInt(page, 10) || 1);
    const _limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (_page - 1) * _limit;

    // sort
    const sortMap = {
      "price.asc": { "price.sale": 1 },
      "price.desc": { "price.sale": -1 },
      "new": { createdAt: -1 },
      "pop": { ratingAvg: -1, ratingCount: -1 },
      "order": { order: 1, title: 1 },
    };
    const sortBy = sortMap[sort] || sortMap["new"];

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(sortBy)
        .skip(skip)
        .limit(_limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return res.json({ success: true, data: items, page: _page, limit: _limit, total });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isId = isValidObjectId(idOrSlug);
    const item = await Product.findOne(isId ? { _id: idOrSlug } : { slug: idOrSlug })
      .lean();
    if (!item) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, data: item });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

/* ------------------------------- UPDATE ------------------------------- */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const patch = { ...req.body };
    // if updating category via slug
    if (!patch.category && patch.categorySlug) {
      patch.category = await resolveCategoryId({ categorySlug: patch.categorySlug });
    }
    // keep inStock in sync with stockQty if provided
    if (patch.stockQty != null) {
      patch.inStock = Number(patch.stockQty) > 0;
    }
    // if images provided, ensure array
    if (patch.images && !Array.isArray(patch.images)) {
      return res.status(400).json({ success: false, message: "images must be an array" });
    }

    const updated = await Product.findByIdAndUpdate(id, patch, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Product not found" });
    return res.json({ success: true, data: updated });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

/* ------------------------------- DELETE ------------------------------- */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
