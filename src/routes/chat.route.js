const express = require("express");
const chatController = require("../controllers/chat.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.post(
  "/accessChat",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  chatController.accessChat
);
router.get(
  "/getChats",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  chatController.fetchChats
);
router.post(
  "/createGroup",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  chatController.createGroupChat
);
router.put(
  "/renameGroup",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  chatController.renameGroup
);
router.put(
  "/removeFromGroup",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  chatController.removeFromGroup
);
router.put(
  "/addToGroup",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  chatController.addToGroup
);

module.exports = router;
