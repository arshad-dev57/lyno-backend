const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },           // snapshot
    sku: { type: String },                              // snapshot
    image: { type: String },                            // snapshot (primary)
    priceSale: { type: Number, required: true, min: 0 },
    priceMrp: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "PKR" },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    subTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    currency: { type: String, default: "PKR" },
  },
  { timestamps: true }
);

// helpers
cartSchema.methods.recalculate = function ({ taxPercent = 0, discount = 0 } = {}) {
  const sub = this.items.reduce((sum, it) => sum + it.priceSale * it.qty, 0);
  this.subTotal = sub;
  this.discount = Math.max(0, Number(discount || this.discount || 0));
  this.tax = Math.max(0, Math.round(((sub - this.discount) * (taxPercent || 0)) * 100) / 100);
  this.grandTotal = Math.max(0, Math.round((sub - this.discount + this.tax) * 100) / 100);
  // currency unify
  this.currency = this.items[0]?.currency || this.currency || "PKR";
};

module.exports = mongoose.model("Cart", cartSchema);
