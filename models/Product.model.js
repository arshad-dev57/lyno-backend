// models/Product.model.js
const mongoose = require("mongoose");

const moneySchema = new mongoose.Schema(
  {
    mrp: { type: Number, required: true, min: 0 },        
    sale: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR" },
    taxPercent: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
  },
  { _id: false }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const attributeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },     // e.g., Weight, Flavor, Size
    value: { type: String, required: true, trim: true },   // e.g., 500g, Chocolate
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },

    // Category binding — primary + multiple categories supported
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],

    sku: { type: String, unique: true, sparse: true, trim: true }, // optional SKU
    brand: { type: String, trim: true },

    shortDescription: { type: String, trim: true },
    description: { type: String, trim: true }, // long rich text (HTML allowed)
    images: { type: [imageSchema], default: [] },

    price: { type: moneySchema, required: true },

    stockQty: { type: Number, default: 0, min: 0 },
    inStock: { type: Boolean, default: true },
    minOrderQty: { type: Number, default: 1, min: 1 },
    maxOrderQty: { type: Number, default: 0, min: 0 }, // 0 = no limit

    attributes: { type: [attributeSchema], default: [] },
    tags: { type: [String], index: true, default: [] },

    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },

    seoTitle: { type: String, trim: true },
    seoDescription: { type: String, trim: true },

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // for sorting in listings
  },
  { timestamps: true }
);

// Text index for search
productSchema.index({ title: "text", description: "text", brand: "text", tags: "text" });

// Slugify
productSchema.pre("validate", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = String(this.title || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  // derive discount if not set
  if (this.price && this.price.mrp > 0) {
    const d = Math.max(0, Math.min(100, Math.round(100 - (this.price.sale / this.price.mrp) * 100)));
    this.price.discountPercent = d;
  }
  this.inStock = (this.stockQty || 0) > 0;
  next();
});

module.exports = mongoose.model("Product", productSchema);
