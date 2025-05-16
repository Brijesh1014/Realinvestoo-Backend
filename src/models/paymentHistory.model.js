const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    related_type: {
      type: String,
      enum: ["banner", "boost", "subscription"],
    },
    banner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Banner",
    },
    BoostProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
    SubscriptionProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
    },

    stripe_customer_id: { type: String },
    stripe_payment_intent_id: { type: String },
    stripe_subscription_id: { type: String },
    stripe_invoice_id: { type: String },
  stripe_checkout_session_id:{type:String},

    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    payment_method: { type: String },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
    },

    start_date: Date,
    end_date: Date,

    error_message: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentHistory", paymentHistorySchema);
