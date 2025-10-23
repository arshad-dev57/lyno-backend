const CategoryGroup = require("../models/CategoryGroup.model");
const Category = require("../models/Category.model");

exports.createGroup = async (req, res) => {
  try {
    const group = await CategoryGroup.create(req.body);
    return res.status(201).json({ success: true, data: group });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const includeCategories = String(req.query.includeCategories || "false") === "true";
    const filter = {};
    if (req.query.activeOnly === "true") filter.isActive = true;

    let groups = await CategoryGroup.find(filter).sort({ order: 1, title: 1 });

    if (includeCategories) {
      const groupIds = groups.map(g => g._id);
      const cats = await Category.find({ group: { $in: groupIds }, isActive: true })
        .sort({ order: 1, title: 1 })
        .lean();

      const byGroup = {};
      cats.forEach(c => {
        const key = String(c.group);
        byGroup[key] = byGroup[key] || [];
        byGroup[key].push(c);
      });

      groups = groups.map(g => ({
        ...g.toObject(),
        categories: byGroup[String(g._id)] || []
      }));
    }

    return res.json({ success: true, data: groups });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const group = await CategoryGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });
    return res.json({ success: true, data: group });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const cats = await Category.findOne({ group: req.params.id });
    if (cats) return res.status(400).json({ success: false, message: "Delete categories first" });
    await CategoryGroup.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (e) {
    return res.status(400).json({ success: false, message: e.message });
  }
};

exports.getCatalog = async (req, res) => {
  try {
    const groups = await CategoryGroup.aggregate([
      { $match: { isActive: true } },
      { $sort: { order: 1, title: 1 } },
      {
        $lookup: {
          from: "categories",
          let: { gid: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ["$group", "$$gid"] }, { $eq: ["$isActive", true] } ] } } },
            { $sort: { order: 1, title: 1 } },
            { $project: { title: 1, slug: 1, image: 1, order: 1 } }
          ],
          as: "categories"
        }
      },
      { $project: { title: 1, slug: 1, heroImage: 1, order: 1, categories: 1 } }
    ]);

    return res.json({ success: true, data: groups });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
