const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
  },
  { timestamps: true }
);

const propertySchema = new mongoose.Schema(
  {
    propertyName: { type: String, required: true },
    propertyType: { type: String, enum: ["Rent", "Sale"], required: true },
    propertySize: { type: Number, required: true },
    rentOrSale: { type: String, enum: ["Rent", "Sale"], required: true },
    agent: { type: String, required: true },
    bedroom: { type: Number, required: true },
    bathroom: { type: Number, required: true },
    kitchen: { type: Number, required: true },
    parking: { type: Number },
    details: { type: String },
    amount: { type: Number, required: true },
    amenities: { type: [String] },
    featured: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    new: { type: Boolean, default: false },
    address: { type: String, required: true },
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    zipcode: { type: String, required: true },
    longitude: { type: Number },
    latitude: { type: Number },
    mainPhoto: { type: String },
    sliderPhotos: { type: [String] },
    bestOffer: { type: Boolean, default: false },
    recommended: { type: Boolean, default: false },
    ratings: { type: Number, default: 0 },
    reviews: [reviewSchema],
  },
  { timestamps: true }
);

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
