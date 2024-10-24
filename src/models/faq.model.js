const mongoose = require("mongoose");

const FAQSchema = new mongoose.Schema(
  {
    title: { type: String },
    description: { type: String },
    question: { type: String },
    answer: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const FAQ = mongoose.model("FAQ", FAQSchema);

module.exports = FAQ;
