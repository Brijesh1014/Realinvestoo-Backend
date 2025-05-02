const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
  },
  content: {
    type: String,
    required: true,
  },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  isSeen: {
    type: Boolean,
    default: false,
  },

  softDelete:[{
   isDeleted:Boolean,
   userId:mongoose.Schema.Types.ObjectId,
  }]
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
