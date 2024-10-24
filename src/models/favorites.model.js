const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const FavoritesSchema = new mongoose.Schema(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },

    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Favorites = mongoose.model("Favorites", FavoritesSchema);

module.exports = Favorites;
