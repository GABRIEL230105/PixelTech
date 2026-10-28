const express = require("express");
const router = express.Router();
const otpController = require("../controllers/otpController");

router.post("/send", otpController.send);
router.post("/resend", otpController.resend);
router.post("/verify", otpController.verify);

module.exports = router;