const Property = require("../models/property.model");
const Appointment = require("../models/appointment.model");
const User = require("../models/user.model");

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
      page = 1,
      limit = 10,
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

    if (topRated) query.ratings = { $gte: 4 };

    if (bestOffer) query.bestOffer = true;

    if (upcoming) query.new = true;

    if (recommended) query.recommended = true;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const skip = (pageNumber - 1) * pageSize;

    const totalProperties = await Property.countDocuments(query);

    const properties = await Property.find(query).skip(skip).limit(pageSize);

    const totalPages = Math.ceil(totalProperties / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Get all properties successful",
      data: properties,
      meta: {
        totalProperties,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: properties.length,
      },
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

const updateProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      upsert: true,
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

    const existingReview = property.reviews.find(
      (r) => r.user.toString() === userId.toString()
    );

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.review = review;
    } else {
      const newReview = {
        user: userId,
        rating,
        review,
      };
      property.reviews.push(newReview);
    }

    const totalRating = property.reviews.reduce(
      (acc, item) => acc + item.rating,
      0
    );
    property.ratings = totalRating / property.reviews.length;

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

const createAppointment = async (req, res) => {
  try {
    const { property, user, date, time, agent, comment } = req.body;

    let propertyIsExits = await Property.findById(property);
    if (!propertyIsExits) {
      return res.status(400).json({
        success: false,
        message: "Property not found",
      });
    }

    let userIsExits = await User.findOne({ _id: user, isEmp: true });
    if (!userIsExits) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    let agentIsExits = await User.findOne({ _id: agent, isAgent: true });
    if (!agentIsExits) {
      return res.status(400).json({
        success: false,
        message: "Agent not found",
      });
    }

    const newAppointment = new Appointment({
      property,
      user,
      date,
      agent,
      time,
      comment,
      createdBy: req.userId,
    });

    await newAppointment.save();
    res.status(201).json({
      success: true,
      message: "Scheduled appointment successful",
      data: newAppointment,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err });
  }
};
const getAllAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const totalCategoriesCount = await Appointment.countDocuments();

    const appointments = await Appointment.find()
      .populate("property", "propertyName propertyType")
      .populate("user", "name email phoneNo")
      .populate("agent", "name email phoneNo")
      .populate("createdBy", "name email phoneNo")
      .skip(skip)
      .limit(pageSize);

    const totalPages = Math.ceil(totalCategoriesCount / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Fetched all appointments successfully",
      data: appointments,
      meta: {
        totalCategoriesCount,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: appointments.length,
      },
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id)
      .populate("property", "propertyName propertyType")
      .populate("user", "name email phoneNo")
      .populate("agent", "name email phoneNo")
      .populate("createdBy", "name email phoneNo");
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Appointment retrieved successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching appointment",
      error: error.message,
    });
  }
};
const getUserAppointments = async (req, res) => {
  try {
    const appointment = await Appointment.find(
      { user: req.userId } || { agent: req.userId } || { createdBy: req.userId }
    )
      .populate("property", "propertyName propertyType")
      .populate("user", "name email phoneNo")
      .populate("agent", "name email phoneNo")
      .populate("createdBy", "name email phoneNo");
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Something went wrong",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Appointment retrieved successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching appointment",
      error: error.message,
    });
  }
};
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateAppointment = await Appointment.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );
    if (!updateAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: updateAppointment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating appointment",
      error: error.message,
    });
  }
};
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAppointment = await Appointment.findByIdAndDelete(id);

    if (!deletedAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Appointment deleted successfully",
      data: deletedAppointment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating appointment",
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
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getUserAppointments,
  updateAppointment,
  deleteAppointment,
};
