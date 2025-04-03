const mongoose = require("mongoose");

const propertyListingTypeSchema = new mongoose.Schema({
  name: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const PropertyListingType = mongoose.model("PropertyListingType",propertyListingTypeSchema);


module.exports = PropertyListingType;