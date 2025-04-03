const mongoose = require("mongoose");

const propertyTypeSchema = new mongoose.Schema({
  name: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const PropertyType = mongoose.model("PropertyType", propertyTypeSchema);


module.exports = PropertyType;