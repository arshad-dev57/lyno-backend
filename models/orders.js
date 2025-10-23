// models/order.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },       // snapshot (same as cart)
    sku: { type: String },                          // snapshot
    image: { type: String },                        // snapshot (primary)
    priceSale: { type: Number, required: true, min: 0 },
    priceMrp: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "PKR" },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    name: { type: String },
    phone: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    zip: { type: String },
    country: { type: String, default: "PK" },
    // optional: coordinates if you want
    // location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] },
  },
  { _id: false }
);

// Payment info
const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ["cod", "card", "wallet", "bank"], default: "cod" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    provider: { type: String },        // e.g. stripe/easypaisa/jazzcash
    transactionId: { type: String },
    paidAt: { type: Date },
  },
  { _id: false }
);

// Status tracking
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"],
      required: true,
    },
    note: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin/user
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // who placed the order
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },

    // helpful human-readable number (e.g. #20251022-0001)
    orderNo: { type: String, index: true, unique: true },

    // items snapshot
    items: { type: [orderItemSchema], default: [] },

    // money
    subTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    currency: { type: String, default: "PKR" },

    // checkout metadata
    address: addressSchema,
    payment: paymentSchema,

    // current status
    status: {
      type: String,
      enum: ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"],
      default: "pending",
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },

    // misc
    note: { type: String },
    couponCode: { type: String },
    walletUsed: { type: Number, default: 0 },
    expectedDeliveryAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.methods.setTotalsFromCart = function (cart, { deliveryFee = 0, serviceFee = 0 } = {}) {
  this.subTotal = cart.subTotal || 0;
  this.discount = cart.discount || 0;
  this.tax = cart.tax || 0;
  this.deliveryFee = deliveryFee || 0;
  this.serviceFee = serviceFee || 0;
  this.grandTotal = Math.max(
    0,
    Math.round((this.subTotal - this.discount + this.tax + this.deliveryFee + this.serviceFee) * 100) / 100
  );
  this.currency = cart.currency || "PKR";
};

// simple order number generator
orderSchema.statics.generateOrderNo = async function () {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const prefix = `${y}${m}${d}`;

  // count orders today to make sequence
  const start = new Date(`${y}-${m}-${d}T00:00:00.000Z`);
  const end = new Date(`${y}-${m}-${String(Number(d) + 1).padStart(2, "0")}T00:00:00.000Z`);
  const count = await this.countDocuments({ createdAt: { $gte: start, $lt: end } });
  const seq = String(count + 1).padStart(4, "0");
  return `#${prefix}-${seq}`;
};

module.exports = mongoose.model("Order", orderSchema);
