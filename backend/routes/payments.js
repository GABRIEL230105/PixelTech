const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const protect = require("../middleware/auth");

router.post("/create-preference", protect, paymentController.createPreference);
// O webhook não passa por "protect" — quem chama é o Mercado Pago, não um usuário logado
router.post("/webhook", paymentController.webhook);

module.exports = router;