const mongoose = require("mongoose");

const categoryGroupSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    heroImage: { type: String },     
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categoryGroupSchema.pre("validate", function (next) {
  if (this.isModified("title") || !this.slug) {
    this.slug = String(this.title || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

module.exports = mongoose.model("CategoryGroup", categoryGroupSchema);
