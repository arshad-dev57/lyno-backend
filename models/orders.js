// models/order.js
const mongoose = require("mongoose");
const Counter = require("./Counter");

/* ========== Order Item ========== */
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    sku: { type: String },
    image: { type: String },
    priceSale: { type: Number, required: true, min: 0 },
    priceMrp: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "PKR" },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

/* ========== Address ========== */
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
  },
  { _id: false }
);

/* ========== Payment ========== */
const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ["cod", "card", "wallet", "bank"], default: "cod" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    provider: { type: String },
    transactionId: { type: String },
    paidAt: { type: Date },
  },
  { _id: false }
);

/* ========== Status History ========== */
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled", "returned"],
      required: true,
    },
    note: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ========== Order Schema ========== */
const orderSchema = new mongoose.Schema(
  {
    // who placed the order
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },

    // helpful human-readable number (e.g. #20251023-0001)
    orderNo: { type: String, index: true, unique: true },

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

/* ========== Methods ========== */
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

/* ========== Order Number Generator (Atomic + Count) ========== */
orderSchema.statics.generateOrderNo = async function () {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dayKey = `${year}${month}${day}`; // e.g. 20251023
  const counterId = `order-${dayKey}`;

  // atomic increment
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // also track total orders (useful analytics)
  const totalOrders = await this.countDocuments();

  const seq = String(counter.seq).padStart(4, "0");
  const orderNo = `#${dayKey}-${seq}`;

  // you can log or attach analytics if needed
  console.log(`Generated order: ${orderNo}, total orders so far: ${totalOrders}`);

  return orderNo;
};

module.exports = mongoose.model("Order", orderSchema);
