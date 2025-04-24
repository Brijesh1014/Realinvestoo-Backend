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
    firstName:{
      type: String,
    },
    lastName:{
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
    gender: {
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
    isBuyer: {
      type: Boolean,
    },
    isSeller: {
      type: Boolean,
    },
    resetOtp: String,
    otpExpiry: Date,
    otpVerified: {
      type: Boolean,
      default: false,
    },
    googleToken: {
      type: String,
    },
    googleId: { type: String },
    fcmToken: {
      type: String,
    },
    dob:{
      type: Date,
    },
    phoneNumber: {
      type: Number,
    },
    countryCode: {
      type: String,
    },
    document:{
      type: String,
    },
    isApproved:{
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

const user = mongoose.model("User", User);
module.exports = user;
