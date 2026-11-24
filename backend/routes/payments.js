const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const protect = require("../middleware/auth");

router.post("/create-preference", protect, paymentController.createPreference);
router.post("/sync", protect, paymentController.syncPayment);
router.post("/webhook", paymentController.webhook);

module.exports = router;