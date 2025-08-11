const express = require("express");
const OrderController = require("../controllers/OrderController");
const checkToken = require("../controllers/middlewares/checkToken");

const router = express.Router();

router.post("/pedidos", checkToken, OrderController.createOrder);
router.get("/pedidos", checkToken, OrderController.getOrders);
router.get("/pedidos/:id", checkToken, OrderController.getOrderById);
router.delete("/super/pedidos/:id", checkToken, OrderController.deleteOrder);
router.put("/super/pedidos/:id", checkToken, OrderController.updateOrder);
router.put(
  "/super/pedidos/:id/status",
  checkToken,
  OrderController.updateOrderStatus
);

module.exports = router;
