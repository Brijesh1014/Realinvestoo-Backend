const Notification = require("../models/notification.model");

const getAllNotification = async (req, res) => {
  try {
    const notifications = await Notification.find();
    return res.status(200).json({
      success: true,
      message: "Get all notifications successful",
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetching notifications",
      error: error.message,
    });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get notification by ID successful",
      data: notification,
    });
  } catch (error) {
    console.error("Error fetching notification by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification by ID",
      error: error.message,
    });
  }
};

const getNotificationsBySenderId = async (req, res) => {
  try {
    const { senderId } = req.params;
    const userId = req.userId;
    const notifications = await Notification.find({ senderId });

    const senderIds = notifications.map((notification) =>
      notification.senderId.toString()
    );

    if (!senderIds.includes(userId.toString())) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to get this notification",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get notifications by sender ID successful",
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications by sender ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications by sender ID",
      error: error.message,
    });
  }
};

const getNotificationsByRecipientId = async (req, res) => {
  try {
    const { recipientId } = req.params;

    const notifications = await Notification.find({
      recipients: { $in: [recipientId] },
    });

    if (notifications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No notifications found for the provided recipient ID",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get notifications by recipient ID successful",
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications by recipient ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications by recipient ID",
      error: error.message,
    });
  }
};
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.userId;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (notification.senderId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this notification",
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

module.exports = {
  getAllNotification,
  getNotificationById,
  getNotificationsBySenderId,
  getNotificationsByRecipientId,
  deleteNotification,
};
