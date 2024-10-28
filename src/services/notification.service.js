const admin = require("firebase-admin");
const serviceAccount = require("../config/firebase-adminsdk.json");
const Token = require("../models/token.model");
const User = require("../models/user.model");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const FCMService = {
  sendNotificationToAllUsers: async (title, message) => {
    console.log("message: ", message);
    console.log("title: ", title);
    try {
      const userTokens = await getAllUserTokens();
      console.log("userTokens: ", userTokens);

      if (userTokens.length === 0) {
        console.log("No tokens found, no notifications sent.");
        return;
      }

      const messagePayload = {
        notification: { title, body: message },
      };

      const response = await admin.messaging().sendEachForMulticast({
        tokens: userTokens,
        ...messagePayload,
      });
      console.log("response: ", response);

      const successCount = response.responses.filter((r) => r.success).length;
      console.log("successCount: ", successCount);
      const error = response.responses.filter((r) => r.error);
      console.log("error: ", error);
      const failureCount = response.responses.length - successCount;

      console.log(
        `${successCount} messages were sent successfully, ${failureCount} failed.`
      );
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  },
};

async function getAllUserTokens() {
  try {
    const empUsers = await User.find({ isEmp: true }, "_id");
    const empUserIds = empUsers.map((user) => user._id);

    const tokens = await Token.find(
      { userId: { $in: empUserIds }, fcmToken: { $ne: null } },
      "fcmToken"
    );
    return tokens.map((token) => token.fcmToken);
  } catch (error) {
    console.error("Error fetching user tokens:", error);
    return [];
  }
}

module.exports = FCMService;
