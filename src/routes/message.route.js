const express = require("express");
const router = express.Router();
const messageController = require("../controllers/message.controller");
const auth = require("../middlewares/auth.middleware");

router.get(
  "/getMessagesByReceiverId/:receiverId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  messageController.getMessagesByReceiverId
);
router.get(
  "/getGroupMessages",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  messageController.getGroupMessages
);
router.get(
  "/getPreviousChat/:userId1/:userId2",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  messageController.getPreviousChat
);
router.get(
  "/getChatPartners/:userId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  messageController.getChatPartners
);
router.put(
  "/markMessagesAsSeen/:chatPartnerId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  messageController.markMessagesAsSeen
);
router.get(
  "/getUnseenMessagesCount",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  messageController.getUnseenMessagesCount
);

module.exports = router;
