const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema({
  name: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const NewsCategory = mongoose.model("NewsCategory", categorySchema);

module.exports = NewsCategory;
