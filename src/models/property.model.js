const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
  },
  { timestamps: true }
);

const propertySchema = new mongoose.Schema(
  {
    propertyName: { type: String },
    propertyType: { type: String },
    propertySize: { type: Number },
    rentOrSale: { type: String, enum: ["Rent","Sale", "PG"] },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bedroom: { type: Number },
    bathroom: { type: Number },
    kitchen: { type: Number },
    parking: { type: Number },
    details: { type: String },
    price: { type: Number },
    currency: { type: String, default: "USD" },
    amenities: { type: [String] },
    featured: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    new: { type: Boolean, default: false },
    address: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    zipcode: { type: String },
    longitude: { type: Number },
    latitude: { type: Number },
    mainPhoto: { type: String },
    sliderPhotos: { type: [String] },
    bestOffer: { type: Boolean, default: false },
    recommended: { type: Boolean, default: false },
    ratings: { type: Number, default: 0 },
    reviews: [reviewSchema],
    favourite: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Like" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    expenses: { type: Number },
    socialSource: { type: Number },
  },
  { timestamps: true }
);

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
