const mongoose = require("mongoose");

const bannerPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number },
    duration: { type: Number },
    offerPrice: { type: Number },
    description: { type: String },
    feature: { type: String },
    status: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BannerPlan", bannerPlanSchema);
