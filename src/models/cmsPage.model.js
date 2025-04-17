const mongoose = require("mongoose");

const CmsPageSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  slug: {
    type: String,
    unique: true,
  },
  content: {
    type: String,
  },
  summary: {
    type: String,
    default: "",
  },
  type: {
    type: String,
  },
  lang: {
    type: String,
    default: "en",
  },
  metaTitle: {
    type: String,
    default: "",
  },
  metaDescription: {
    type: String,
    default: "",
  },
  metaKeywords: {
    type: String,
    default: "",
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  customFields: {
    type: Object,
    default: {},
  },
});

module.exports = mongoose.model("CmsPage", CmsPageSchema);
