const Group = require("../models/group.model");
const Message = require("../models/message.model");

const initSocketIo = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("sendMessage", async ({ senderId, receiverId, content }) => {
      const newMessage = new Message({ senderId, receiverId, content });
      try {
        await newMessage.save();
        io.emit("receiveMessage", newMessage);
      } catch (error) {
        console.log("Error saving message:", error);
      }
    });

    socket.on("sendGroupMessage", async ({ senderId, groupId, content }) => {
      const newMessage = new Message({ senderId, groupId, content });
      try {
        await newMessage.save();
        const group = await Group.findById(groupId).populate("members");
        group.members.forEach((member) => {
          io.to(member.userId.toString()).emit(
            "receiveGroupMessage",
            newMessage
          );
        });
      } catch (error) {
        console.log("Error saving group message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};

module.exports = initSocketIo;
