// routes/order.routes.js
const router = require("express").Router();
const ctrl = require("../controller/order.controller");
const auth = require("../middleware/auth_middleware");

// User
router.post("/", auth, ctrl.placeOrder);              // POST /api/orders
router.get("/my", auth, ctrl.myOrders);               // GET  /api/orders/my
router.get("/my", auth, ctrl.listMyOrders);
router.patch("/my/:id/cancel", auth, ctrl.cancelMyOrder); // PATCH /api/orders/my/:id/cancel

// Admin

module.exports = router;
