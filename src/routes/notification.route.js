const express = require("express");
const notificationController = require("../controllers/notification.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.get(
  "/getAllNotifications",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  notificationController.getAllNotification
);
router.get(
  "/getNotificationById/:id",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  notificationController.getNotificationById
);

router.get(
  "/getNotificationBySenderId/:senderId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  notificationController.getNotificationsBySenderId
);

router.get(
  "/getNotificationByRecipientId/:recipientId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  notificationController.getNotificationsByRecipientId
);

router.delete(
  "/deleteNotification/:notificationId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  notificationController.deleteNotification
);

module.exports = router;
