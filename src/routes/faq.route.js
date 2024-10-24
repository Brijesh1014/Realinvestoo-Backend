const express = require("express");
const auth = require("../middlewares/auth.middleware");
const FAQController = require("../controllers/faq.controller");
const router = express.Router();

router.post("/", auth(["isEmp", "isAdmin"]), FAQController.createFAQ);

router.get("/", FAQController.getAllFaq);

router.get("/:id", FAQController.getFaqById);

router.put("/:id", auth(["isEmp", "isAdmin"]), FAQController.updateFAQ);

router.delete("/:id", auth(["isEmp", "isAdmin"]), FAQController.deleteFAQ);

module.exports = router;
