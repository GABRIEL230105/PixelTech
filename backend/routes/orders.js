const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const protect = require("../middleware/auth");

router.post("/", protect, orderController.create);
router.get("/my", protect, orderController.myOrders);
router.get("/:id", protect, orderController.getOne);

module.exports = router;