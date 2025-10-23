const Category = require("../models/Category.model");

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    return res.status(201).json({ success: true, data: category });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const filter = {};
    if (req.query.group) filter.group = req.query.group;
    if (req.query.parent) filter.parent = req.query.parent;
    if (req.query.activeOnly === "true") filter.isActive = true;

    const items = await Category.find(filter)
      .sort({ order: 1, title: 1 })
      .lean();

    return res.json({ success: true, data: items });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const item = await Category.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: item });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const item = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, data: item });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    // optional: prevent delete if has children
    const hasChildren = await Category.findOne({ parent: req.params.id });
    if (hasChildren) {
      return res.status(400).json({ success: false, message: "Delete sub-categories first" });
    }
    await Category.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};
