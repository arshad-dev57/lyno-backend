// controllers/order.controller.js
const Cart = require("../models/cart_model");
const Order = require("../models/orders");
const Product = require("../models/Product.model");

const TAX_PERCENT = 0.0; // yahan tumhari app ka constant laga do (same as cart side)

exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    // client se aayega (checkout screen se)
    const {
      address,                 
      paymentMethod = "cod",  
      deliveryFee = 0,
      serviceFee = 0,
      note,
      couponCode,
      walletUsed = 0,
    } = req.body || {};

    // user cart
    const cart = await Cart.findOne({ user: userId }).lean();
    if (!cart || !cart.items?.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // OPTIONAL: stock check
    const productIds = cart.items.map((it) => it.product);
    const products = await Product.find({ _id: { $in: productIds } }).select("stockQty inStock").lean();
    const stockMap = new Map(products.map((p) => [String(p._id), p]));

    for (const it of cart.items) {
      const p = stockMap.get(String(it.product));
      if (!p || p.stockQty < it.qty) {
        return res.status(400).json({ success: false, message: "Insufficient stock for some items" });
      }
    }

    // create order
    const order = new Order({
      user: userId,
      items: cart.items.map((it) => ({
        product: it.product,
        title: it.title,
        sku: it.sku,
        image: it.image,
        priceSale: it.priceSale,
        priceMrp: it.priceMrp,
        currency: it.currency || cart.currency || "PKR",
        qty: it.qty,
      })),
      address: address || undefined,
      payment: { method: paymentMethod, status: paymentMethod === "cod" ? "pending" : "pending" },
      note,
      couponCode,
      walletUsed,
      status: "pending",
      statusHistory: [{ status: "pending", note: "Order placed" }],
    });

    // totals
    order.setTotalsFromCart(cart, { deliveryFee, serviceFee });
    order.orderNo = await Order.generateOrderNo();

    await order.save();

    // reduce stock for each item
    await Promise.all(
      cart.items.map(async (it) => {
        await Product.updateOne(
          { _id: it.product },
          { $inc: { stockQty: -it.qty }, $set: { inStock: true } }
        );
      })
    );

    // clear cart
    await Cart.updateOne({ user: userId }, { $set: { items: [] , subTotal:0, discount:0, tax:0, grandTotal:0 } });

    return res.json({ success: true, data: order });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// user: list my orders
exports.myOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments({ user: userId }),
    ]);

    res.json({ success: true, data: items, total });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};


 
exports.listMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;               // from auth middleware
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const { status } = req.query;

    const filter = { user: userId };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          "orderNo status grandTotal currency createdAt " +
          "items.title items.image items.qty items.priceSale"
        )
        // .populate("items.product", "title image priceSale") // <-- enable if needed
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: items,
      meta: { page, limit, total }
    });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

// user: cancel
exports.cancelMyOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, user: userId });
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    if (["shipped", "delivered", "cancelled", "returned"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Order cannot be cancelled now" });
    }

    order.status = "cancelled";
    order.statusHistory.push({ status: "cancelled", note: "Cancelled by user", by: userId });
    await order.save();

    // optional: restock
    await Promise.all(
      order.items.map(async (it) => {
        await Product.updateOne(
          { _id: it.product },
          { $inc: { stockQty: +it.qty }, $set: { inStock: true } }
        );
      })
    );

    res.json({ success: true, data: order });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// admin: list with filters
exports.adminList = async (req, res) => {
  try {
    const { status, q, page = 1, limit = 20, from, to } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};

    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (q) {
      filter.$or = [
        { orderNo: new RegExp(q, "i") },
        { "address.name": new RegExp(q, "i") },
        { "address.phone": new RegExp(q, "i") },
      ];
    }

    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, data: items, total });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

// admin: update status
exports.adminUpdateStatus = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { id } = req.params;
    const { status, note } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.status = status;
    order.statusHistory.push({ status, note, by: adminId });
    await order.save();

    res.json({ success: true, data: order });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};
