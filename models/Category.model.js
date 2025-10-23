const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug:  { type: String, required: true, index: true },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "CategoryGroup", required: true },
    image: { type: String },               // small tile image/icon
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // optional nested taxonomy support
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  },
  { timestamps: true }
);

// unique (group+slug) so same slug allowed in different groups
categorySchema.index({ group: 1, slug: 1 }, { unique: true });

categorySchema.pre("validate", function (next) {
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

module.exports = mongoose.model("Category", categorySchema);
