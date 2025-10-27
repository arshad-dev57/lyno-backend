const mongoose = require("mongoose");
const Cart = require("../models/cart_model");
const Product = require("../models/Product.model");

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);
const TAX_PERCENT = 0; // e.g., 0.17 for 17% VAT


exports.addItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, qty = 1 } = req.body;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid productId" });
    }
    if (qty <= 0) {
      return res.status(400).json({ success: false, message: "qty must be >= 1" });
    }

    const prod = await Product.findById(productId).lean();
    if (!prod || prod.isActive === false) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    if (prod.stockQty !== undefined && prod.stockQty < qty) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    const primaryImage = (prod.images || []).find((i) => i.isPrimary)?.url || prod.images?.[0]?.url || "";

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });
    const idx = cart.items.findIndex((it) => String(it.product) === String(prod._id));
    if (idx >= 0) {
      cart.items[idx].qty += qty;
    } else {
      cart.items.push({
        product: prod._id,
        title: prod.title,
        sku: prod.sku,
        image: primaryImage,
        priceSale: prod.price?.sale ?? 0,
        priceMrp: prod.price?.mrp ?? 0,
        currency: prod.price?.currency || "PKR",
        qty,
      });
    }

    cart.recalculate({ taxPercent: TAX_PERCENT });
    await cart.save();

    return res.status(200).json({ success: true, data: cart });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};


exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId }) || new Cart({ user: userId });
    return res.json({ success: true, data: cart });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
exports.updateQty = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.user?.sub;
    const { productId, qty } = req.body;

    // 1. auth check
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 2. validate inputs
    if (!isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid productId" });
    }

    if (qty <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "qty must be >= 1" });
    }

    // 3. load user's cart
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // 4. find product line in cart
    const idx = cart.items.findIndex(
      (it) => String(it.product) === String(productId)
    );
    if (idx < 0) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    // 5. stock check
    const prod = await Product.findById(productId)
      .select("stockQty")
      .lean();

    if (prod && prod.stockQty < qty) {
      return res.status(400).json({
        success: false,
        message: "Insufficient stock",
      });
    }

    // 6. UPDATE THE CORRECT FIELD
    // your schema uses "qty", not "quantity"
    cart.items[idx].qty = qty;

    // 7. recalc totals
    cart.recalculate({ taxPercent: TAX_PERCENT });

    // 8. save
    await cart.save();

    // 9. send updated cart back
    return res.json({
      success: true,
      data: cart,
    });
  } catch (e) {
    console.error("updateQty error:", e);
    return res.status(400).json({
      success: false,
      message: e.message || "Error updating quantity",
    });
  }
};

exports.removeItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid productId" });
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.items = cart.items.filter((it) => String(it.product) !== productId);
    cart.recalculate({ taxPercent: TAX_PERCENT });
    await cart.save();

    return res.json({ success: true, data: cart });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.json({ success: true, data: { items: [], subTotal: 0, discount: 0, tax: 0, grandTotal: 0 } });

    cart.items = [];
    cart.recalculate({ taxPercent: TAX_PERCENT, discount: 0 });
    await cart.save();

    return res.json({ success: true, data: cart });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
exports.applyDiscount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { discount = 0 } = req.body; 

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

    cart.recalculate({ taxPercent: TAX_PERCENT, discount: Number(discount) || 0 });
    await cart.save();

    return res.json({ success: true, data: cart });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
