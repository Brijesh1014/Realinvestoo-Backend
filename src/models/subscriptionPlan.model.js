const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number },
    duration: { type: Number },
    offerPrice: { type: Number },
    description: { type: String },
    feature: { type: String },
    status: { type: String },
    stripePriceId: { type: String },
    propertyLimit: { type: Number, required: true },
    billingInterval:{type:String,default : "month"},
    currency:{type:String, default:"inr"}
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
