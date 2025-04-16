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
  },
  { timestamps: true }
);

const Banner = mongoose.model("Banner", bannerSchema);

module.exports = Banner;
