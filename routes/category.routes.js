// routes/category.routes.js

// Option A: simple one-liner
const router = require("express").Router();

const grp = require("../Controllers/categorygroup.controller");
const cat = require("../Controllers/category.controller");

router.post("/category-groups", grp.createGroup);
router.get("/category-groups", grp.getGroups); // ?i=true
router.patch("/category-groups/:id", grp.updateGroup);
router.delete("/category-groups/:id", grp.deleteGroup);

// ---- CATEGORIES ----
router.post("/categories", cat.createCategory);
router.get("/categories", cat.getCategories);           
router.get("/categories/:id", cat.getCategory);
router.patch("/categories/:id", cat.updateCategory);
router.delete("/categories/:id", cat.deleteCategory);
router.get("/catalog", grp.getCatalog);
router.get("/__ping", (req, res) => res.json({ ok: true }));

module.exports = router;
