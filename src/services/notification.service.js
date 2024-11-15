const admin = require("firebase-admin");
require("dotenv").config();
const serviceAccount = JSON.parse(process.env.FIREBASE_SECRET);
const Token = require("../models/token.model");
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
};

async function getAllUserTokens() {
  try {
    const empUsers = await User.find({}, "_id");
    const empUserIds = empUsers.map((user) => user._id);

    const tokens = await Token.find(
      { userId: { $in: empUserIds }, fcmToken: { $ne: null } },
      "userId fcmToken"
    );

    return tokens.map((token) => ({
      empUserId: token.userId,
      fcmToken: token.fcmToken,
    }));
  } catch (error) {
    console.error("Error fetching user tokens:", error);
    return [];
  }
}

module.exports = FCMService;
