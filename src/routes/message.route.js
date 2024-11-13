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
  "/getGroupMessages/:groupId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  messageController.getGroupMessages
);
router.get(
  "/getPreviousChat/:userId1/:userId2",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  messageController.getPreviousChat
);

module.exports = router;
