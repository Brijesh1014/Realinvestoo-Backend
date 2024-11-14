const Group = require("../models/group.model");
const Message = require("../models/message.model");

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

        const group = await Group.findById(groupId).populate("members");
        group.members.forEach((member) => {
          io.to(member.userId.toString()).emit(
            "receiveGroupMessage",
            populatedMessage
          );
        });
      } catch (error) {
        console.log("Error saving group message:", error);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, "Reason:", reason);
    });
  });
};

module.exports = initSocketIo;
