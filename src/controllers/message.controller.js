const Message = require("../models/message.model");
const mongoose = require("mongoose");
const getMessagesByReceiverId = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const messages = await Message.find({ receiverId }).sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      message: "Messages retrieved successfully",
      data: messages,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve messages",
      error: error.message,
    });
  }
};

const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ groupId }).sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      message: "Group messages retrieved successfully",
      data: messages,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve group messages",
      error: error.message,
    });
  }
};

const getPreviousChat = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    }).sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      message: "Previous chat retrieved successfully",
      data: messages,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Could not retrieve previous chat",
      error: error.message,
    });
  }
};

const getChatPartners = async (req, res) => {
  try {
    const { userId } = req.params;

    const objectIdUserId = new mongoose.Types.ObjectId(userId);

    const chatPartners = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: objectIdUserId }, { receiverId: objectIdUserId }],
        },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$senderId", objectIdUserId] },
              then: "$receiverId",
              else: "$senderId",
            },
          },
          lastMessage: { $last: "$content" },
          lastMessageTime: { $last: "$timestamp" },
          unseenMessages: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", objectIdUserId] },
                    { $eq: ["$isSeen", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          userId: "$_id",
          "userDetails.name": 1,
          "userDetails.profileImage": 1,
          lastMessage: 1,
          lastMessageTime: 1,
          unseenMessages: 1,
        },
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ]);

    return res.status(200).json({
      success: true,
      message: "Chat partners retrieved successfully",
      data: chatPartners,
    });
  } catch (error) {
    console.error("Error retrieving chat partners:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const markMessagesAsSeen = async (req, res) => {
  try {
    const { chatPartnerId } = req.params;
    const userId = req.userId;

    await Message.updateMany(
      {
        senderId: chatPartnerId,
        receiverId: userId,
        isSeen: false,
      },
      { isSeen: true },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Messages marked as seen",
    });
  } catch (error) {
    console.error("Error marking messages as seen:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
const getUnseenMessagesCount = async (req, res) => {
  try {
    const { userId } = req.params;

    const unseenCount = await Message.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(userId),
          isSeen: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Unseen messages count retrieved successfully",
      data: unseenCount,
    });
  } catch (error) {
    console.error("Error retrieving unseen messages count:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getMessagesByReceiverId,
  getGroupMessages,
  getPreviousChat,
  getChatPartners,
  markMessagesAsSeen,
  getUnseenMessagesCount,
};
