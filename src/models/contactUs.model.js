const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ContactUs = new Schema(
  {
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    subject: {
      type: String,
    },
    messageTitle: {
      type: String,
    },
    message: {
      type: String,
    },
    createdBy: {
      type: String,
    },
    reply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReplySend",
    },
  },
  { timestamps: true }
);

const contactUs = mongoose.model("ContactUs", ContactUs);

module.exports = contactUs;
