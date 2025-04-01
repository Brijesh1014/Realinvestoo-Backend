const express = require("express");
const notificationController = require("../controllers/notification.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.get(
  "/getAllNotifications",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  notificationController.getAllNotification
);
router.get(
  "/getNotificationById/:id",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  notificationController.getNotificationById
);

router.get(
  "/getNotificationBySenderId/:senderId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  notificationController.getNotificationsBySenderId
);

router.get(
  "/getNotificationByRecipientId/:recipientId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  notificationController.getNotificationsByRecipientId
);

router.delete(
  "/deleteNotification/:notificationId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  notificationController.deleteNotification
);

module.exports = router;
