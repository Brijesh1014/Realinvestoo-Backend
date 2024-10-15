const Property = require("../models/property.model");

// Create Property
const createProperty = async (req, res) => {
  try {
    const property = new Property(req.body);
    await property.save();
    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: property,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create property",
      error: error.message,
    });
  }
};

// Get All Properties
const getAllProperties = async (req, res) => {
  try {
    const {
      location,
      type,
      minPrice,
      maxPrice,
      minSize,
      maxSize,
      bedrooms,
      bathrooms,
      kitchen,
      parking,
      amenities,
      search,
      topRated,
      bestOffer,
      upcoming,
      recommended,
    } = req.query;

    const query = {};

    if (location) query.address = { $regex: location, $options: "i" };

    if (type) query.propertyType = type;

    if (minPrice || maxPrice) {
      query.amount = { $gte: minPrice || 0, $lte: maxPrice || 1000000 };
    }

    if (minSize || maxSize) {
      query.propertySize = { $gte: minSize || 0, $lte: maxSize || 1000000 };
    }

    if (bedrooms) query.bedroom = { $gte: bedrooms };

    if (bathrooms) query.bathroom = { $gte: bathrooms };

    if (kitchen) query.kitchen = { $gte: kitchen };

    if (parking) query.parking = { $gte: parking };

    if (amenities) query.amenities = { $all: amenities.split(",") };

    if (search) {
      query.$or = [
        { propertyName: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    if (topRated) {
      query.ratings = { $gte: 4 };
    }

    if (bestOffer) {
      query.bestOffer = true;
    }

    if (upcoming) {
      query.new = true;
    }

    if (recommended) {
      query.recommended = true;
    }

    const properties = await Property.find(query);

    return res.status(200).json({
      success: true,
      message: "Get all properties successful",
      data: properties,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve properties",
      error: error.message,
    });
  }
};

// Get Property By ID
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Get property successful",
      data: property,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve property",
      error: error.message,
    });
  }
};

// Update Property
const updateProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update property",
      error: error.message,
    });
  }
};

// Delete Property
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete property",
      error: error.message,
    });
  }
};

const addReview = async (req, res) => {
  const { propertyId } = req.params;
  const { rating, review } = req.body;
  const userId = req.userId;
  console.log("userId: ", userId);

  try {
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Check if the user already reviewed this property
    const existingReview = property.reviews.find(
      (r) => r.user.toString() === userId.toString()
    );

    if (existingReview) {
      // Update the existing review
      existingReview.rating = rating;
      existingReview.review = review;
    } else {
      // Add new review
      const newReview = {
        user: userId,
        rating,
        review,
      };
      property.reviews.push(newReview);
    }

    // Calculate the new average rating
    const totalRating = property.reviews.reduce(
      (acc, item) => acc + item.rating,
      0
    );
    property.ratings = totalRating / property.reviews.length;

    // Save the updated property
    await property.save();

    return res.status(200).json({
      success: true,
      message: "Review added/updated successfully",
      data: property,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Error adding review",
      error: error.message,
    });
  }
};

module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  addReview,
};
