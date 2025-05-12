const Group = require("../models/group.model");
const Message = require("../models/message.model");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const Property = require("../models/property.model");
const initSocketIo = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinChat", ({ userId, propertyId }) => {
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const userRoom = `user_${userId}`;
        socket.join(userRoom);
        console.log(`User ${userId} joined personal room: ${userRoom}`);

        if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
          const uniqueRoomId = `property_${propertyId}_user_${userId}`;
          socket.join(uniqueRoomId);
          console.log(
            `User ${userId} joined property chat room: ${uniqueRoomId}`
          );

          socket.emit("joinedChat", {
            success: true,
            roomId: uniqueRoomId,
            message: "Successfully joined property chat",
          });
        } else {
          socket.emit("joinedChat", {
            success: true,
            roomId: userRoom,
            message: "Successfully joined personal chat room",
          });
        }
      } else {
        socket.emit("error", {
          message: "Valid userId is required to join the chat.",
        });
      }
    });
    socket.on(
      "sendMessage",
      async ({ senderId, content, propertyId, receiverId }) => {
        try {
          if (!senderId || !content) {
            return socket.emit("error", {
              message: "Sender ID and message content are required.",
            });
          }
          let finalReceiverId = receiverId;
          let room;
          if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
            const property = await Property.findById(propertyId).select(
              "createdBy agent"
            );
            if (!property) {
              return socket.emit("error", { message: "Property not found." });
            }
            const receiverUserId = property.agent
              ? property.agent.toString()
              : property.createdBy.toString();
            const isOwnerOrAgentSending = senderId === receiverUserId;

            if (isOwnerOrAgentSending && receiverId) {
              room = `property_${propertyId}_user_${receiverId}`;
              finalReceiverId = receiverId;
            } else {
              room = `property_${propertyId}_user_${senderId}`;
              finalReceiverId = receiverUserId;
            }
          } else if (
            receiverId &&
            mongoose.Types.ObjectId.isValid(receiverId)
          ) {
            room = `user_${receiverId}`;
          } else {
            return socket.emit("error", {
              message: "Receiver ID or Property ID is required.",
            });
          }
          const newMessage = new Message({
            senderId,
            receiverId: finalReceiverId,
            content,
            ...(propertyId ? { propertyId } : {}),
            timestamp: new Date(),
            isSeen: false,
          });
          await newMessage.save();
          const populatedMessage = await Message.findById(newMessage._id)
            .populate("senderId", "name profileImage")
            .populate("receiverId", "name profileImage")
            .populate("propertyId");
          io.to(`user_${finalReceiverId}`).emit(
            "receiveMessage",
            populatedMessage
          );
          // if (room) {
          //   io.to(room).emit("receiveMessage", populatedMessage);
          // }
          console.log(
            `Message sent from ${senderId} to ${finalReceiverId} in room: ${
              room || "direct"
            }`
          );
        } catch (error) {
          console.error("Error sending message:", error);
          socket.emit("error", {
            message: "Failed to send message",
            error: error.message,
          });
        }
      }
    );
    socket.on(
      "markMessagesAsSeen",
      async ({ userId, chatPartnerId, propertyId }) => {
        try {
          if (chatPartnerId) {
            await Message.updateMany(
              { senderId: chatPartnerId, receiverId: userId, isSeen: false },
              { $set: { isSeen: true } }
            );
          }

          if (propertyId) {
            await Message.updateMany(
              {
                propertyId: new mongoose.Types.ObjectId(propertyId),
                receiverId: userId,
                isSeen: false,
              },
              { $set: { isSeen: true } }
            );
          }

          socket.emit("messagesSeen", {
            success: true,
            message: "Messages marked as seen",
          });
        } catch (error) {
          console.error("Error marking messages as seen:", error);
          socket.emit("messagesSeenError", {
            success: false,
            message: "Error marking messages as seen",
            error: error.message,
          });
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

        const objectId = new mongoose.Types.ObjectId(userIdString);

        const unseenDirect = await Message.aggregate([
          {
            $match: {
              receiverId: objectId,
              isSeen: false,
              propertyId: { $exists: false },
            },
          },
          {
            $group: {
              _id: "$senderId",
              count: { $sum: 1 },
            },
          },
        ]);

        const unseenProperty = await Message.aggregate([
          {
            $match: {
              isSeen: false,
              receiverId: objectId,
              propertyId: { $exists: true },
            },
          },
          {
            $group: {
              _id: "$propertyId",
              count: { $sum: 1 },
              senderId: { $first: "$senderId" },
            },
          },
          {
            $lookup: {
              from: "properties",
              localField: "_id",
              foreignField: "_id",
              as: "property",
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "senderId",
              foreignField: "_id",
              as: "sender",
            },
          },
          {
            $unwind: "$property",
          },
          {
            $unwind: "$sender",
          },
          {
            $project: {
              propertyId: "$_id",
              count: 1,
              "property.title": 1,
              "property.location": 1,
              "sender._id": 1,
              "sender.name": 1,
            },
          },
        ]);

        socket.emit("unseenMessagesCount", {
          unseenDirect,
          unseenProperty,
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

    socket.on(
      "getPreviousChat",
      async ({ userId1, userId2, currentUserId, propertyId }) => {
        try {
          const query = {
            $or: [
              { senderId: userId1, receiverId: userId2 },
              { senderId: userId2, receiverId: userId1 },
            ],
            $nor: [
              {
                softDelete: {
                  $elemMatch: {
                    userId: new mongoose.Types.ObjectId(currentUserId),
                    isDeleted: true,
                  },
                },
              },
            ],
          };

          if (propertyId && mongoose.Types.ObjectId.isValid(propertyId)) {
            query.propertyId = new mongoose.Types.ObjectId(propertyId);
          }

          const messages = await Message.find(query)
            .sort({ timestamp: 1 })
            .populate("senderId", "name profileImage")
            .populate("receiverId", "name profileImage")
            .populate("propertyId");

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
      }
    );

    socket.on("getChatPartners", async (userId) => {
      try {
        const userIdString = userId?.userId || userId;
        const objectIdUserId = new mongoose.Types.ObjectId(userIdString);

        const directChatPartners = await Message.aggregate([
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
                  propertyId: { $exists: false },
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
            $sort: { timestamp: 1 },
          },
          {
            $group: {
              _id: {
                user: {
                  $cond: {
                    if: { $eq: ["$senderId", objectIdUserId] },
                    then: "$receiverId",
                    else: "$senderId",
                  },
                },
              },
              lastMessage: { $last: "$content" },
              messageId: { $last: "$_id" },
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
              localField: "_id.user",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          { $unwind: "$userDetails" },
          {
            $project: {
              userId: "$_id.user",
              userDetails: {
                name: "$userDetails.name",
                profileImage: "$userDetails.profileImage",
              },
              lastMessage: 1,
              lastMessageTime: 1,
              unseenMessages: 1,
              messageId: 1,
              chatType: { $literal: "direct" },
            },
          },
          { $sort: { lastMessageTime: -1 } },
        ]);

        const userProperties = await Property.find({
          createdBy: objectIdUserId,
        })
          .select("_id")
          .lean();

        const userPropertyIds = userProperties.map((prop) => prop._id);

        const ownerPropertyChats =
          userPropertyIds.length > 0
            ? await Message.aggregate([
                {
                  $match: {
                    propertyId: { $in: userPropertyIds },
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
                  $sort: { timestamp: 1 },
                },
                {
                  $group: {
                    _id: {
                      property: "$propertyId",
                      user: {
                        $cond: {
                          if: { $eq: ["$senderId", objectIdUserId] },
                          then: "$receiverId",
                          else: "$senderId",
                        },
                      },
                    },
                    lastMessage: { $last: "$content" },
                    messageId: { $last: "$_id" },
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
                    from: "properties",
                    localField: "_id.property",
                    foreignField: "_id",
                    as: "property",
                  },
                },
                {
                  $unwind: "$property",
                },
                {
                  $lookup: {
                    from: "users",
                    localField: "_id.user",
                    foreignField: "_id",
                    as: "userDetails",
                  },
                },
                {
                  $unwind: "$userDetails",
                },
                {
                  $project: {
                    propertyId: "$_id.property",
                    userId: "$_id.user",
                    property: "$property",
                    userDetails: {
                      name: "$userDetails.name",
                      profileImage: "$userDetails.profileImage",
                    },
                    lastMessage: 1,
                    lastMessageTime: 1,
                    unseenMessages: 1,
                    messageId: 1,
                    chatType: { $literal: "property" },
                  },
                },
                { $sort: { lastMessageTime: -1 } },
              ])
            : [];

        const userPropertyChats = await Message.aggregate([
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
                  propertyId: { $exists: true },
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
            $sort: { timestamp: 1 },
          },
          {
            $group: {
              _id: {
                property: "$propertyId",
                otherUser: {
                  $cond: {
                    if: { $eq: ["$senderId", objectIdUserId] },
                    then: "$receiverId",
                    else: "$senderId",
                  },
                },
              },
              lastMessage: { $last: "$content" },
              messageId: { $last: "$_id" },
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
              from: "properties",
              localField: "_id.property",
              foreignField: "_id",
              as: "property",
            },
          },
          {
            $unwind: "$property",
          },
          {
            $lookup: {
              from: "users",
              localField: "_id.otherUser",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          {
            $unwind: "$userDetails",
          },
          {
            $project: {
              propertyId: "$_id.property",
              userId: "$_id.otherUser",
              property: "$property", // Changed to include the entire property object
              userDetails: {
                name: "$userDetails.name",
                profileImage: "$userDetails.profileImage",
              },
              lastMessage: 1,
              lastMessageTime: 1,
              unseenMessages: 1,
              messageId: 1,
              chatType: { $literal: "property" },
            },
          },
          { $sort: { lastMessageTime: -1 } },
          {
            $match: {
              "property.ownerId": { $ne: objectIdUserId },
            },
          },
        ]);

        const propertyChats = [...ownerPropertyChats, ...userPropertyChats];

        socket.emit("chatPartners", {
          success: true,
          message: "Chat partners retrieved successfully",
          data: {
            directChats: directChatPartners,
            propertyChats: propertyChats,
          },
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

    // Handle user disconnect
    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, "Reason:", reason);
    });
  });
};

module.exports = initSocketIo;
