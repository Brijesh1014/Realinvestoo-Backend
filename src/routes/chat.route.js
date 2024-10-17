const express = require("express");
const chatController = require("../controllers/chat.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.post(
  "/accessChat",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  chatController.accessChat
);
router.get(
  "/getChats",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  chatController.fetchChats
);
router.post(
  "/createGroup",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  chatController.createGroupChat
);
router.put(
  "/renameGroup",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  chatController.renameGroup
);
router.put(
  "/removeFromGroup",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  chatController.removeFromGroup
);
router.put(
  "/addToGroup",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  chatController.addToGroup
);

module.exports = router;
