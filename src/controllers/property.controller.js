const Property = require("../models/property.model");
const Appointment = require("../models/appointment.model");
const User = require("../models/user.model");
const {
  uploadToCloudinary,
  cloudinary,
} = require("../services/cloudinary.service");
const Favorites = require("../models/favorites.model");
const FCMService = require("../services/notification.service");

const createProperty = async (req, res) => {
  try {
    let mainPhotoUrl = null;
    if (req.files && req.files.mainPhoto && req.files.mainPhoto[0]) {
      const mainPhoto = req.files.mainPhoto[0];
      mainPhotoUrl = await uploadToCloudinary(mainPhoto);
    }
    let sliderPhotosUrl = [];
    if (
      req.files &&
      req.files.sliderPhotos &&
      req.files.sliderPhotos.length > 0
    ) {
      const sliderPhotos = req.files.sliderPhotos;
      for (const photo of sliderPhotos) {
        const photoUrl = await uploadToCloudinary(photo);
        sliderPhotosUrl.push(photoUrl);
      }
    }

    const propertyDetails = new Property({
      mainPhoto: mainPhotoUrl || null,
      sliderPhotos: sliderPhotosUrl.length > 0 ? sliderPhotosUrl : null,
      ...req.body,
    });
    const message = `Check out the latest property: ${propertyDetails.propertyName}`;
    await FCMService.sendNotificationToAllUsers(
      propertyDetails.propertyName,
      message
    );

    const propertyData = await propertyDetails.save();
    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: propertyData,
    });
  } catch (error) {
    console.error("Error creating property: ", error);
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
      timeFilter,
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Filters
    if (location) query.address = { $regex: location, $options: "i" };
    if (type) query.propertyType = type;
    if (minPrice || maxPrice) {
      query.price = { $gte: minPrice || 0, $lte: maxPrice || 1000000 };
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

    // Time Filters
    if (timeFilter) {
      const now = new Date();
      let startDate;
      switch (timeFilter) {
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "year":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          break;
      }
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Pagination
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    // Query for total properties
    const totalProperties = await Property.countDocuments(query);

    // Query for sold properties
    const soldProperties = await Property.countDocuments({
      ...query,
      rentOrSale: "Sold",
    });

    // Query for rent properties
    const rentProperties = await Property.countDocuments({
      ...query,
      rentOrSale: "Rent",
    });

    // Query for vacant properties (visible = true and not sold)
    const vacantProperties = await Property.countDocuments({
      ...query,
      rentOrSale: { $ne: "Sold" },
      visible: true,
    });

    // Fetch paginated properties
    const properties = await Property.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalProperties / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Get all properties successful",
      data: properties,
      meta: {
        totalProperties,
        soldProperties,
        rentProperties,
        vacantProperties,
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
    let property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (req.file) {
      const existingProperty = await Property.findById(req.params.id);
      if (existingProperty && existingProperty.mainPhoto) {
        const existingMainPhotoPublicId = existingProperty.mainPhoto
          .split("/")
          .pop()
          .split(".")[0];

        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          public_id: existingMainPhotoPublicId,
          overwrite: true,
        });

        req.body.mainPhoto = uploadResult.secure_url;
      } else {
        const uploadResult = await uploadToCloudinary(req.file);
        req.body.mainPhoto = uploadResult;
      }
    }

    property = await Property.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: property,
    });
  } catch (error) {
    console.error("Error updating property: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update property",
      error: error.message,
    });
  }
};

const uploadNewSliderPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    if (
      !req.files ||
      !req.files.sliderPhotos ||
      req.files.sliderPhotos.length === 0
    ) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const newImageUrls = [];
    const sliderPhotos = req.files.sliderPhotos;

    for (const file of sliderPhotos) {
      const uploadResponse = await cloudinary.uploader.upload(file.path);
      newImageUrls.push(uploadResponse.secure_url);
    }

    await Property.updateOne(
      { _id: id },
      { $addToSet: { sliderPhotos: { $each: newImageUrls } } }
    );

    return res.status(200).json({
      success: true,
      message: "Slider photos uploaded successfully",
      data: newImageUrls,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const removeSliderImages = async (req, res) => {
  try {
    const { sliderPhotos, id } = req.body;
    if (
      !sliderPhotos ||
      !Array.isArray(sliderPhotos) ||
      sliderPhotos.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "No images specified for removal" });
    }

    const existingProperty = await Property.findById(id);
    if (!existingProperty) {
      return res.status(404).json({ message: "Property not found" });
    }
    for (const image of sliderPhotos) {
      const publicId = image.split("/").pop().split(".")[0];

      await cloudinary.uploader.destroy(publicId);
    }

    await Property.updateOne(
      { _id: id },
      { $pull: { sliderPhotos: { $in: sliderPhotos } } }
    );

    return res
      .status(200)
      .json({ success: true, message: "Slider images removed successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.mainPhoto) {
      const mainPhotoPublicId = property.mainPhoto
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(mainPhotoPublicId);
    }

    // Delete slider photos from Cloudinary
    if (property.sliderPhotos && property.sliderPhotos.length > 0) {
      const deletePromises = property.sliderPhotos.map(async (photoUrl) => {
        const publicId = photoUrl.split("/").pop().split(".")[0];
        return cloudinary.uploader.destroy(publicId);
      });
      await Promise.all(deletePromises);
    }

    await Property.findByIdAndDelete(req.params.id);

    await Appointment.deleteMany({ property: req.params.id });

    await Favorites.deleteMany({ property: req.params.id });

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting property: ", error);
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
      .populate("property", "propertyName mainPhoto sliderPhotos propertyType")
      .populate("user", "name email profileImage phoneNo")
      .populate("agent", "name email profileImage phoneNo")
      .populate("createdBy", "name email profileImage phoneNo")
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
      .populate("property", "propertyName mainPhoto sliderPhotos propertyType")
      .populate("user", "name email profileImage phoneNo")
      .populate("agent", "name email profileImage phoneNo")
      .populate("createdBy", "name email profileImage phoneNo");
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
      .populate("property", "propertyName mainPhoto sliderPhotos propertyType")
      .populate("user", "name email profileImage phoneNo")
      .populate("agent", "name email profileImage phoneNo")
      .populate("createdBy", "name email profileImage phoneNo");
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

const analyticDashboard = async (req, res) => {
  try {
    const topFavoriteProperties = await Favorites.aggregate([
      {
        $group: {
          _id: "$propertyId",
          favouriteCount: { $sum: 1 },
        },
      },
      {
        $sort: { favouriteCount: -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 0,
          propertyId: "$_id",
          favouriteCount: 1,
        },
      },
    ]);

    const soldProperties = await Property.aggregate([
      {
        $match: { rentOrSale: "Sold" },
      },
      {
        $group: {
          _id: {
            month: { $month: "$updatedAt" },
            year: { $year: "$updatedAt" },
          },
          propertiesSold: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const recentProperties = await Property.find({})
      .sort({ createdAt: -1 })
      .limit(5);
    const totalProperties = await Property.countDocuments();

    const totalCustomers = await User.countDocuments({
      $or: [{ isEmp: true }, { isAgent: true }, { isProuser: true }],
    });

    const totalSold = await Property.countDocuments({ rentOrSale: "Sold" });
    const totalRent = await Property.countDocuments({ rentOrSale: "Rent" });
    const totalVacant = await Property.countDocuments({
      rentOrSale: { $ne: "Sold" },
      visible: true,
    });

    res.status(200).json({
      success: true,
      message: "Get analytic data successful",
      soldProperties,
      topFavoriteProperties,
      recentProperties,
      totalProperties,
      totalCustomers,
      totalSold,
      totalRent,
      totalVacant,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};

module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  uploadNewSliderPhoto,
  removeSliderImages,
  deleteProperty,
  addReview,
  createAppointment,
  getAllAppointments,
  getAppointmentById,
  getUserAppointments,
  updateAppointment,
  deleteAppointment,
  analyticDashboard,
};
