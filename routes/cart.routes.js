const router = require("express").Router();
const ctrl = require("../controllers/cart.controller");
const auth = require("../middleware/auth_middleware");
router.get("/get", auth, ctrl.getCart);
router.post("/add", auth, ctrl.addItem);
router.patch("/update", auth, ctrl.updateQty);
router.delete("/item/:productId", auth, ctrl.removeItem);
router.delete("/cart", auth, ctrl.clearCart);
router.post("/cart/discount", ctrl.applyDiscount);

module.exports = router;