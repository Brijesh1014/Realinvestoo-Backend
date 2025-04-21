const mongoose = require("mongoose");

const amenitiesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image:{
      type: String,
    }
  },
  { timestamps: true }
);


const Amenities = mongoose.model("Amenities", amenitiesSchema);

module.exports = Amenities;