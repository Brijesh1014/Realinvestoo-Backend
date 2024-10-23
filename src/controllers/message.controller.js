const Message = require("../models/message.model");
const User = require("../models/user.model");
const Chat = require("../models/chat.model");

const allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name email profileImage")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
      console.log("Invalid data passed into request");
      return res.sendStatus(400);
    }

    let newMessage = {
      sender: req.userId,
      content: content,
      chat: chatId,
    };

    let message = await Message.create(newMessage);
    console.log("message: ", message);

    message = await message.populate("sender", "name");
    message = await message.populate("chat");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name email profileImage",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

    res.json(message);
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
};

module.exports = { allMessages, sendMessage };
