const mongoose = require("mongoose");

const boostPlanSchema = new mongoose.Schema(
  {
    name: { type: String,required:true },
    price: { type: Number },
    duration: { type: Number },
    offerPrice: { type: Number },
    description: { type: String },
    feature: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BoostPlan", boostPlanSchema);
