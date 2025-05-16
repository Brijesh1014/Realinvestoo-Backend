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
    propertyType: { type: mongoose.Schema.Types.ObjectId, ref: "PropertyType" },
    listingType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyListingType",
    },
    propertyId: { type: String },
    propertiesFacing: { type: String },
    negotiable: { type: Boolean, default: false },
    dateOfListing: { type: Date, default: Date.now },
    builtUpArea: { type: Number },
    floorNumber: { type: Number },
    totalFloors: { type: Number },
    balconyOrTerrace: { type: Boolean, default: false },
    furnishingStatus: {
      type: String,
      enum: ["Furnished", "Semi-Furnished", "Unfurnished"],
    },
    neighborhood: {
      type: String,
    },
    ownershipStatus: {
      type: String,
    },
    legalStatus: {
      type: String,
    },
    description: {
      type: String,
    },
    builtYear: {
      type: String,
    },
    videoLink: {
      type: String,
    },
    propertySize: { type: Number },
    rentOrSale: { type: String, enum: ["Rent", "Sale", "PG"] },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bedroom: { type: Number },
    bathroom: { type: Number },
    kitchen: { type: Number },
    parking: { type: Number },
    details: { type: String },
    price: { type: Number },
    currency: { type: String, default: "USD" },
    amenities: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Amenities" }],
    },
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
    bestOffer: { type: Boolean, default: false },
    recommended: { type: Boolean, default: false },
    ratings: { type: Number, default: 0 },
    reviews: [reviewSchema],
    favourite: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Like" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    expenses: { type: Number },
    socialSource: { type: Number },

    mainPhoto: { type: String },
    sliderPhotos: { type: [String] },
    floorPlanUpload: { type: [String] },
    propertyDocuments: { type: [String] },
    viewCount: { type: Number, default: 0 },
    status: { type: String },
    isSold: { type: Boolean, default: false },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    boostPlan: [
      {
        plan: { type: mongoose.Schema.Types.ObjectId, ref: "BoostPlan" },
        expiryDate: { type: Date },
      },
    ],
    isBoost:{type:Boolean,default:false},
    subscriptionPlan: [
      {
        plan: { type: mongoose.Schema.Types.ObjectId, ref: "subscriptionPlan" },
        expiryDate: { type: Date },
      },
    ],

    expiryDate: { type: Date },
  },
  { timestamps: true }
);

const Property = mongoose.model("Property", propertySchema);

module.exports = Property;
