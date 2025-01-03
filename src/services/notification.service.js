const admin = require("firebase-admin");
require("dotenv").config();
const serviceAccount = JSON.parse(process.env.FIREBASE_SECRET);
const User = require("../models/user.model");
const Notification = require("../models/notification.model");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const FCMService = {
  sendNotificationToAllUsers: async (senderId, title, message) => {
    try {
      const userTokensData = await getAllUserTokens();

      if (userTokensData.length === 0) {
        console.log("No tokens found, no notifications sent.");
        return;
      }

      const recipients = userTokensData.map((data) => data.empUserId);
      const userTokens = userTokensData.map((data) => data.fcmToken);

      const messagePayload = {
        notification: { title, body: message },
      };

      const response = await admin.messaging().sendEachForMulticast({
        tokens: userTokens,
        ...messagePayload,
      });

      const successCount = response.responses.filter((r) => r.success).length;
      const error = response.responses.filter((r) => r.error);
      const failureCount = response.responses.length - successCount;

      console.log(
        `${successCount} messages were sent successfully, ${failureCount} failed.`
      );

      await Notification.create({
        title,
        message,
        senderId,
        recipients: recipients,
        tokens: userTokens,
        successCount,
        failureCount,
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  },

  sendNotificationToUser: async (senderId, recipientId, title, message) => {
    try {
      const user = await User.findById(recipientId);

      if (!user || !user.fcmToken) {
        console.log(`No FCM token found for user ${recipientId}`);
        return;
      }

      const messagePayload = {
        notification: { title, body: message },
      };

      const response = await admin.messaging().send({
        token: user.fcmToken,
        ...messagePayload,
      });

      await Notification.create({
        title,
        message,
        senderId,
        recipients: [recipientId],
        tokens: [user.fcmToken],
        successCount: response ? 1 : 0,
        failureCount: response ? 0 : 1,
      });

      console.log(`Notification sent to user ${recipientId}`);
    } catch (error) {
      console.error(
        `Error sending notification to user ${recipientId}:`,
        error
      );
    }
  },
};

async function getAllUserTokens() {
  try {
    const fcmTokens = await User.find(
      { fcmToken: { $ne: null } },
      "_id fcmToken"
    ).lean();

    return fcmTokens.map((token) => ({
      empUserId: token._id,
      fcmToken: token.fcmToken,
    }));
  } catch (error) {
    console.error("Error fetching user tokens:", {
      message: error.message,
      stack: error.stack,
    });
    return [];
  }
}

module.exports = FCMService;
