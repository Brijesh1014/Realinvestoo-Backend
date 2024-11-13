const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: { type: String },
  category: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewsCategory",
      required: true,
    },
  ],
  description: { type: String },
  image: { type: String },
  creatorName: { type: String },
  dateOfPost: { type: Date },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: { type: String },
});
const News = mongoose.model("News", newsSchema);

module.exports = News;
