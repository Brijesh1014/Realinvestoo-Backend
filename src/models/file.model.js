const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    name: [{ type: String, required: true }],
    path: [{ type: String, required: true }],
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const File = mongoose.model("File", fileSchema);
module.exports = File;
