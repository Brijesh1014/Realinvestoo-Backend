const Group = require("../models/group.model");
const Message = require("../models/message.model");
const mongoose = require("mongoose");

const initSocketIo = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
      const newMessage = new Message({ senderId, receiverId, content });
      try {
        await newMessage.save();
        const populatedMessage = await Message.findById(newMessage._id)
          .populate("senderId")
          .populate("receiverId");

        io.emit("receiveMessage", populatedMessage);
      } catch (error) {
        console.log("Error saving message:", error);
      }
    });

    socket.on("sendGroupMessage", async ({ senderId, groupId, content }) => {
      const newMessage = new Message({ senderId, groupId, content });
      try {
        await newMessage.save();
        const populatedMessage = await Message.findById(
          newMessage._id
        ).populate("senderId");

        io.emit("receiveGroupMessage", populatedMessage);
      } catch (error) {
        console.log("Error saving group message:", error);
      }
    });
    socket.on(
      "markMessagesAsSeen",
      async ({ userId, chatPartnerId, groupId }) => {
        try {
          if (chatPartnerId) {
            await Message.updateMany(
              {
                senderId: chatPartnerId,
                receiverId: userId,
                isSeen: false,
              },
              { $set: { isSeen: true } }
            );
          }

          if (groupId) {
            await Message.updateMany(
              {
                groupId,
                senderId: { $ne: userId },
                isSeen: false,
              },
              { $set: { isSeen: true } }
            );
          }
          socket.emit("messagesSeen", {
            success: true,
            message: "Messages marked as seen",
          });

          console.log("Messages marked as seen:", {
            userId,
            chatPartnerId,
            groupId,
          });
        } catch (error) {
          console.error("Error marking messages as seen:", error);
        }
      }
    );

    socket.on("getUnseenMessagesCount", async (userId) => {
      try {
        const userIdString = userId?.userId || userId;

        if (!mongoose.Types.ObjectId.isValid(userIdString)) {
          return socket.emit("unseenMessagesCountError", {
            success: false,
            message: "Invalid userId format",
          });
        }

        const unseenDirect = await Message.aggregate([
          {
            $match: {
              receiverId: new mongoose.Types.ObjectId(userIdString),
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

        const unseenGroup = await Message.aggregate([
          {
            $match: {
              groupId: { $exists: true },
              isSeen: false,
              senderId: { $ne: new mongoose.Types.ObjectId(userIdString) },
            },
          },
          {
            $group: {
              _id: "$groupId",
              count: { $sum: 1 },
            },
          },
        ]);

        socket.emit("unseenMessagesCount", {
          unseenDirect,
          unseenGroup,
        });
      } catch (error) {
        console.error("Error retrieving unseen messages count:", error);
        socket.emit("unseenMessagesCountError", {
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, "Reason:", reason);
    });
  });
};

module.exports = initSocketIo;
