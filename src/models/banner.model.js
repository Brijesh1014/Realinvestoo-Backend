const mongoose = require("mongoose");

const bannerSchema = mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    link: { type: String },
    image: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: { type: String },
    isPaid:{type:Boolean,default:false},
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "BannerPlan" },
    isExpired: { type: Boolean, default: false },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
