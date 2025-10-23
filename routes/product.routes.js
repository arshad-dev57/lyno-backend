// routes/product.routes.js
const router = require("express").Router();
const ctrl = require("../Controllers/product.controller");

router.post("/add", ctrl.createProduct);
router.get("/get", ctrl.getProducts);
router.get("/products/:idOrSlug", ctrl.getProduct);
router.patch("/products/:id", ctrl.updateProduct);
router.delete("/products/:id", ctrl.deleteProduct);

module.exports = router;
