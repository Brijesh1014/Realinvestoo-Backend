const mongoose = require("mongoose");

const propertyViewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
    viewedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

propertyViewSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

const PropertyView = mongoose.model("PropertyView", propertyViewSchema);

module.exports = PropertyView;