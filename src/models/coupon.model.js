const mongoose = require("mongoose");

const couponSchema = mongoose.Schema({
  couponName: { type: String },
  shopName: { type: String },
  couponCode: { type: String },
  discount: { type: String },
  startDate: { type: Date },
  expiryDate: { type: Date },
  description: { type: String },
  couponImage: { type: String },
  status: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
