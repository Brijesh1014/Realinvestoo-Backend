const Group = require("../models/group.model");
const Message = require("../models/message.model");
const mongoose = require("mongoose");
const User = require("../models/user.model");

const initSocketIo = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send direct message
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

    // Send group message
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

    // Mark messages as seen
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

    // Retrieve unseen messages count
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

    // Retrieve previous chat
    socket.on("getPreviousChat", async ({ userId1, userId2, currentUserId }) => {
      try {

        const messages = await Message.find({
          $or: [
            { senderId: userId1, receiverId: userId2 },
            { senderId: userId2, receiverId: userId1 },
          ],
          $nor: [
            { 
              softDelete: { 
                $elemMatch: { 
                  userId: new mongoose.Types.ObjectId(currentUserId),
                  isDeleted: true 
                }
              }
            }
          ],
        }).sort({ timestamp: 1 });
    
        socket.emit("previousChat", {
          success: true,
          message: "Previous chat retrieved successfully",
          data: messages,
        });
      } catch (error) {
        console.error("Error retrieving previous chat:", error);
        socket.emit("previousChatError", {
          success: false,
          message: "Could not retrieve previous chat",
          error: error.message,
        });
      }
    });
    
    
    socket.on("getChatPartners", async (userId) => {
      try {
        const userIdString = userId?.userId || userId;
        const objectIdUserId = new mongoose.Types.ObjectId(userIdString);
    
        const chatPartners = await Message.aggregate([
          {
            $match: {
              $and: [
                {
                  $or: [
                    { senderId: objectIdUserId },
                    { receiverId: objectIdUserId },
                  ],
                },
                {
                  $nor: [
                    {
                      softDelete: {
                        $elemMatch: {
                          userId: objectIdUserId,
                          isDeleted: true,
                        },
                      },
                    },
                  ],
                },
              ],
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
              messageId:{$last:"$_id"},
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
              from: "users", // Assuming your user collection is named "users"
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
              messageId:1
            },
          },
          {
            $sort: { lastMessageTime: -1 },
          },
        ]);
    
        socket.emit("chatPartners", {
          success: true,
          message: "Chat partners retrieved successfully",
          data: chatPartners,
        });
      } catch (error) {
        console.error("Error retrieving chat partners:", error);
        socket.emit("chatPartnersError", {
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });
    

    socket.on("getAllGroups", async (userId) => {
      try {
        const user = await User.findById(userId.userId);
        if (!user.isAdmin) {
          return socket.emit("error", {
            success: false,
            message: "Only admin can view all groups",
          });
        }
        const groups = await Group.find().sort({ createdAt: -1 });
        const groupsWithLastMessage = await Promise.all(
          groups.map(async (group) => {
            const lastMessage = await Message.findOne({
              groupId: group._id,
              $nor: [
                {
                  softDelete: {
                    $elemMatch: {
                      userId: new mongoose.Types.ObjectId(userId.userId),
                      isDeleted: true,
                    },
                  },
                },
              ],
            })
              .sort({ createdAt: -1 })
              .limit(1); 
    
          return {
            ...group.toObject(),
            lastMessageId : lastMessage? lastMessage._id : null,
            lastMessage: lastMessage ? lastMessage.content : null, 
          };
        }));
    
        socket.emit("allGroups", {
          success: true,
          message: "Groups retrieved successfully",
          data: groupsWithLastMessage,
        });
      } catch (error) {
        console.error("Error retrieving groups:", error);
        socket.emit("allGroupsError", {
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });

    socket.on("getAllGroupMessages", async (userId) => {

      try {
        const objectIdUserId = new mongoose.Types.ObjectId(userId.userId);

        const groupMessages = await Message.aggregate([
          {
            $match: {
              groupId: { $exists: true, $ne: null },
            },
          },
          {
            $lookup: {
              from: "groups",
              localField: "groupId",
              foreignField: "_id",
              as: "groupDetails",
            },
          },
          {
            $unwind: "$groupDetails",
          },
          {
            $match: {
              "groupDetails.members.userId": objectIdUserId,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "senderId",
              foreignField: "_id",
              as: "senderDetails",
            },
          },
          {
            $unwind: "$senderDetails",
          },
          {
            $project: {
              groupId: "$groupId",
              groupName: "$groupDetails.groupName",
              groupImage: "$groupDetails.groupImage",
              messageId: "$_id",
              content: "$content",
              timestamp: "$timestamp",
              isSeen: "$isSeen",
              senderDetails: {
                name: "$senderDetails.name",
                senderId: "$senderDetails._id",
                profileImage: "$senderDetails.profileImage",
              },
            },
          },
          {
            $sort: { timestamp: 1 },
          },
        ]);

        socket.emit("allGroupsMessages", {
          success: true,
          message: "All group messages retrieved successfully",
          data: groupMessages.reverse(),
        });
      } catch (error) {
        console.error("Error retrieving group messages:", error);
        socket.emit("groupMessagesError", {
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });

    
    socket.on("getGroupMessages", async ({ userId, groupId }) => {
      try {
        const objectIdUserId = new mongoose.Types.ObjectId(userId);
        const objectIdGroupId = new mongoose.Types.ObjectId(groupId);
    
        const group = await Group.findOne({
          _id: objectIdGroupId,
          "members.userId": objectIdUserId,
        });
        
        if (!group) {
          socket.emit("groupMessages", {
            success: false,
            message: "You are not a member of this group or there are no messages.",
            data: [],
          });
          return;
        }
    
        const groupMessages = await Message.aggregate([
          {
            $match: {
              groupId: objectIdGroupId,
      
              $nor: [
                {
                  softDelete: {
                    $elemMatch: {
                      userId: objectIdUserId,
                      isDeleted: true,
                    },
                  },
                },
              ],
            },
            
          },
          {
            $lookup: {
              from: "groups",
              localField: "groupId",
              foreignField: "_id",
              as: "groupDetails",
            },
          },
          {
            $unwind: "$groupDetails",
          },
          {
            $lookup: {
              from: "users",
              localField: "senderId",
              foreignField: "_id",
              as: "senderDetails",
            },
          },
          {
            $unwind: "$senderDetails",
          },
          {
            $project: {
              groupId: "$groupId",
              groupName: "$groupDetails.groupName",
              groupImage: "$groupDetails.groupImage",
              messageId: "$_id",
              content: "$content",
              timestamp: "$timestamp",
              isSeen: "$isSeen",
              senderDetails: {
                name: "$senderDetails.name",
                senderId: "$senderDetails._id",
                profileImage: "$senderDetails.profileImage",
              },
            },
          },
          {
            $sort: { timestamp: 1 },
          },
        ]);
    
        socket.emit("groupMessages", {
          success: true,
          message: "Messages for the group retrieved successfully",
          data: groupMessages
        });
    
      } catch (error) {
        console.error("Error retrieving group messages:", error);
        socket.emit("groupMessagesError", {
          success: false,
          message: "Server error",
          error: error.message,
        });
      }
    });
    

    // Handle user disconnect
    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, "Reason:", reason);
    });
  });
};

module.exports = initSocketIo;
