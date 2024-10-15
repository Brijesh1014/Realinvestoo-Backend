const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const User = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    phoneNo: {
      type: Number,
    },
    username: {
      type: String,
    },
    password: {
      type: String,
    },
    conformPassword: {
      type: String,
    },
    profileImage: {
      type: String,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    zipCode: {
      type: String,
    },
    reasonForJoining: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
    },
    isAgent: {
      type: Boolean,
    },
    isProuser: {
      type: Boolean,
    },
    isEmp: {
      type: Boolean,
    },
    resetOtp: String,
    otpExpiry: Date,
    otpVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const user = mongoose.model("User", User);
module.exports = user;
