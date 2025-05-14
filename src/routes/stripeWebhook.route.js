const express = require("express");
const router = express.Router();
const stripeWebhook = require("../controllers/stripeWebhook.controller");

router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

module.exports = router;
