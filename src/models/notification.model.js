const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String },
    message: { type: String },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    tokens: [String],
    isRead:{type:Boolean,default:false,},
    successCount: { type: Number, default: 0 },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
