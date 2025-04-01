const Group = require("../models/group.model");
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
    const userId = req.userId;
    const objectIdUserId = new mongoose.Types.ObjectId(userId);

    const groupMessages = await Message.aggregate([
      // Match messages associated with groups
      {
        $match: {
          groupId: { $exists: true, $ne: null },
        },
      },
      // Lookup group details for each message
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
      // Match groups where the current user is a member
      {
        $match: {
          "groupDetails.members.userId": objectIdUserId,
        },
      },
      // Lookup sender details for each message
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
      // Project the relevant fields
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

    return res.status(200).json({
      success: true,
      message: "All group messages retrieved successfully",
      data: groupMessages.reverse(),
    });
  } catch (error) {
    console.error("Error retrieving group messages:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
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
    const { chatPartnerId, groupId } = req.params;
    const userId = req.userId;

    if (chatPartnerId) {
      await Message.updateMany(
        {
          senderId: chatPartnerId,
          receiverId: userId,
          isSeen: false,
        },
        { $set: { isSeen: true } }
      );
    } else if (groupId) {
      await Message.updateMany(
        {
          groupId,
          isSeen: false,
          senderId: { $ne: userId },
        },
        { $set: { isSeen: true } }
      );
    }

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
    const userId = req.userId;

    const unseenDirect = await Message.aggregate([
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

    const unseenGroup = await Message.aggregate([
      {
        $match: {
          groupId: { $exists: true },
          isSeen: false,
          senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        },
      },
      {
        $group: {
          _id: "$groupId",
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Unseen messages count retrieved successfully",
      data: {
        unseenDirect,
        unseenGroup,
      },
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


const deleteSingleMessage = async(req,res)=>{
  try {
    const {id}=req.params
    const userId = req.userId
    let singleMessage = await Message.findById(id)
    if(userId !== singleMessage.senderId){
      return res.status(400).json({
        success:false,
        message:"Do not allow"
      })
    }
    singleMessage.deleteOne()

    return res.status(200).json({
      success:true,
      message:"Single message deleted successful "
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}


const deletePreviousChat = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;

    const messages = await Message.deleteMany({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    });


    return res.status(200).json({
      success: true,
      message: "Deleted previous chat successfully",
      data: messages,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const softDeletedPreviousChat = async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const userId = req.userId; 
    
    if (userId !== userId1 && userId !== userId2) {
      return res.status(400).json({
        success: false,
        message: "You are not authorized to delete this chat",
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    });

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No messages found between these users",
      });
    }

const updatedMessages = await Message.updateMany(
  {
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 },
    ],
  },
  {
    $push: {
      softDelete: {
        isDeleted: true,
        userId: new mongoose.Types.ObjectId(userId),
      },
    },
  },
  {
    returnDocument: 'after', 
  }
);


    return res.status(200).json({
      success: true,
      message: "Previous chat marked as deleted successfully",
      data: updatedMessages,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const softDeleteSingleChat = async(req,res)=>{
  try {
    const {id}=req.params

    const userId = new mongoose.Types.ObjectId(req.userId)
    console.log('userId: ', userId);
    

    let singleMessage = await Message.findById(id);
    console.log('singleMessage: ', singleMessage);

    if (!singleMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }
    
    const isAlreadyDeleted = singleMessage?.softDelete.some(
      (entry) => entry?.userId?.equals(userId)
   
    );
    
    if (isAlreadyDeleted) {
      return res.status(403).json({
        success: false,
        message: "Already deleted",
      });
    }

    if (
      !singleMessage.senderId.equals(userId) &&
      !singleMessage.receiverId.equals(userId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this chat",
      });
    }
  
    singleMessage.softDelete.push({
      isDeleted: true,
      userId: new mongoose.Types.ObjectId(userId),
    });
    await singleMessage.save();
    
    return res.status(200).json({
      success: true,
      message: "Message soft-deleted successfully",
      data: singleMessage,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

const deleteGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.userId);

    const groupData = await Group.findById(groupId);
    if (!groupData) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isAdmin = groupData.members.some(
      (member) => member.userId.equals(userId) && member.role === "admin"
    );
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete group messages",
      });
    }

    const deleteResult = await Message.deleteMany({ groupId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No messages found to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} messages deleted successfully`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const softDeleteGroupMessages = async(req,res)=>{
  try {
    const { groupId } = req.params;
    const userId = new mongoose.Types.ObjectId(req.userId);

    const groupMessages = await Message.find({ groupId });
    if (!groupMessages || groupMessages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Group messages not found",
      });
    }

    const groupData = await Group.findById(groupId);
    console.log('groupData: ', groupData);
    if (!groupData) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = groupData.members.some(
      (member) => member.userId.equals(userId) && member.role === "admin" || member.role === "member"
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete group messages",
      });
    }

    const updatedMessages = [];
    for (const message of groupMessages) {
      const alreadyDeleted = message.softDelete.some((entry) =>
        entry.userId.equals(userId)
      );

      if (alreadyDeleted) {
        continue; 
      }

      message.softDelete.push({
        isDeleted: true,
        userId,
      });
      updatedMessages.push(message.save());
    }

    await Promise.all(updatedMessages);

    return res.status(200).json({
      success: true,
      message: "Messages soft-deleted successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

const softDeleteSingleGroupMessage = async(req,res)=>{
  try {
    const {messageId,groupId} = req.params
    const userId = new mongoose.Types.ObjectId(req.userId)
    
    let singleGroupMessage = await Message.findById(messageId);

    if (!singleGroupMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    
    const groupData = await Group.findById(groupId);
    if (!groupData) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const isMember = groupData.members.some(
      (member) => member.userId.equals(userId) && member.role === "admin" || "member"
    );
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "Only member can delete messages",
      });
    }

      
    singleGroupMessage.softDelete.push({
      isDeleted: true,
      userId: new mongoose.Types.ObjectId(userId),
    });
    await singleGroupMessage.save();
    return res.status(200).json({
      success: true,
      message: "Group message soft-deleted successfully",
      data: singleGroupMessage,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}





module.exports = {
  getMessagesByReceiverId,
  getGroupMessages,
  getPreviousChat,
  getChatPartners,
  markMessagesAsSeen,
  getUnseenMessagesCount,
  deletePreviousChat,
  softDeletedPreviousChat,
  deleteSingleMessage,
  softDeleteSingleChat,
  deleteGroupMessages,
  softDeleteGroupMessages,
  softDeleteSingleGroupMessage
};
