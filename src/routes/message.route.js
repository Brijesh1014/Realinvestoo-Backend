const express = require("express");
const router = express.Router();
const messageController = require("../controllers/message.controller");
const auth = require("../middlewares/auth.middleware");

router.get(
  "/getMessagesByReceiverId/:receiverId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.getMessagesByReceiverId
);
router.get(
  "/getGroupMessages",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.getGroupMessages
);
router.get(
  "/getPreviousChat/:userId1/:userId2",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.getPreviousChat
);
router.get(
  "/getChatPartners/:userId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.getChatPartners
);
router.put(
  "/markMessagesAsSeen/:chatPartnerId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.markMessagesAsSeen
);
router.get(
  "/getUnseenMessagesCount",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.getUnseenMessagesCount
);

router.delete(
  "/deletePreviousChat/:userId1/:userId2",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.deletePreviousChat
);

router.put(
  "/softDeletedPreviousChat/:userId1/:userId2",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.softDeletedPreviousChat
);

router.put(
  "/softDeleteSingleChat/:id",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.softDeleteSingleChat
);

router.delete(
  "/deleteGroupMessages/:groupId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.deleteGroupMessages
);


router.put(
  "/softDeleteGroupMessages/:groupId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.softDeleteGroupMessages
);


router.put(
  "/softDeleteSingleGroupMessage/:messageId/:groupId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  messageController.softDeleteSingleGroupMessage
);
module.exports = router;
