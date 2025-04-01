const express = require("express");
const router = express.Router();
const contactUsController = require("../controllers/contactUs.controller");
const auth = require("../middlewares/auth.middleware");

router.post(
  "/create",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  contactUsController.createContactUs
);
router.get(
  "/getAllContactUs",
  auth(["isAdmin"]),
  contactUsController.getAllContactUs
);
router.get(
  "/getContactUsById/:id",
  auth(["isAdmin"]),
  contactUsController.getContactUsById
);
router.delete(
  "/deleteContactUs/:id",
  auth(["isAdmin"]),
  contactUsController.deleteContactUs
);
router.post("/sendReply", auth(["isAdmin"]), contactUsController.sendReply);
router.get(
  "/getInquiriesWithoutReply",
  auth(["isAdmin"]),
  contactUsController.getInquiriesWithoutReply
);
router.get(
  "/getSentReplyById/:id",
  auth(["isAdmin"]),
  contactUsController.getSentReplyById
);
router.get(
  "/getAllSentReplies",
  auth(["isAdmin"]),
  contactUsController.getAllSentReplies
);
module.exports = router;
