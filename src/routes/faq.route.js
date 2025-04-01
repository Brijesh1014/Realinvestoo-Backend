const express = require("express");
const auth = require("../middlewares/auth.middleware");
const FAQController = require("../controllers/faq.controller");
const router = express.Router();

router.post("/", auth(["isBuyer", "isAdmin", "isSeller"]), FAQController.createFAQ);

router.get("/", FAQController.getAllFaq);

router.get("/:id", FAQController.getFaqById);

router.put(
  "/:id",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  FAQController.updateFAQ
);

router.delete(
  "/:id",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  FAQController.deleteFAQ
);

module.exports = router;
