const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const LikeSchema = new mongoose.Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    isLike: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Likes = mongoose.model("Like", LikeSchema);

module.exports = Likes;
