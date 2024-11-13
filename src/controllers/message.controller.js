const Message = require("../models/message.model");

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

module.exports = { getMessagesByReceiverId, getGroupMessages, getPreviousChat };
