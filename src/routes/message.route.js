const express = require("express");
const messageController = require("../controllers/message.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.get(
  "/getMessages/:chatId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  messageController.allMessages
);
router.post(
  "/sendMessage",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  messageController.sendMessage
);

module.exports = router;
