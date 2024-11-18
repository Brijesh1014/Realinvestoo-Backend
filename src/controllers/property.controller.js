const Property = require("../models/property.model");
const Appointment = require("../models/appointment.model");
const Likes = require("../models/like.model");
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
      if (mainPhoto.mimetype.startsWith("image/")) {
        mainPhotoUrl = await uploadToCloudinary(mainPhoto);
      } else {
        return res.status(400).json({
          success: false,
          message: "Main photo must be an image",
        });
      }
    }

    let sliderPhotosUrl = [];
    if (
      req.files &&
      req.files.sliderPhotos &&
      req.files.sliderPhotos.length > 0
    ) {
      const sliderPhotos = req.files.sliderPhotos;
      for (const photo of sliderPhotos) {
        if (photo.mimetype.startsWith("image/")) {
          const photoUrl = await uploadToCloudinary(photo);
          sliderPhotosUrl.push(photoUrl);
        } else {
          return res.status(400).json({
            success: false,
            message: "All slider photos must be images",
          });
        }
      }
    }

    if (req.body.agent) {
      const agentIsExits = await User.findOne({
        _id: req.body.agent,
        isAgent: true,
      });
      if (!agentIsExits) {
        return res.status(400).json({
          success: false,
          message: "Agent not found",
        });
      }
    }

    const propertyDetails = new Property({
      mainPhoto: mainPhotoUrl || null,
      sliderPhotos: sliderPhotosUrl.length > 0 ? sliderPhotosUrl : null,
      createdBy: req.userId,
      ...req.body,
    });
    const senderId = req.userId;
    const message = `Check out the latest property: ${propertyDetails.propertyName}`;
    await FCMService.sendNotificationToAllUsers(
      senderId,
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
      isFeatured,
      page = 1,
      limit = 10,
      rentOrSale,
      isLike,
    } = req.query;

    const query = {};

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
    if (isFeatured === "true") query.featured = true;
    else if (isFeatured === "false") query.featured = false;

    switch (rentOrSale) {
      case "Rent":
        query.rentOrSale = "Rent";
        break;
      case "Sale":
        query.rentOrSale = "Sale";
        break;
      case "PG":
        query.rentOrSale = "PG";
        break;
      default:
        break;
    }

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
      if (startDate) query.createdAt = { $gte: startDate };
    }

    if (req.userId && isLike) {
      const userLikes = await Likes.find({
        userId: req.userId,
        isLike: true,
      }).select("propertyId");
      const likedPropertyIds = userLikes.map((like) => like.propertyId);

      if (isLike === "true") {
        query._id = { $in: likedPropertyIds };
      } else if (isLike === "false") {
        query._id = { $nin: likedPropertyIds };
      }
    }

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const totalProperties = await Property.countDocuments(query);
    const saleProperties = await Property.countDocuments({
      ...query,
      rentOrSale: "Sale",
    });
    const rentProperties = await Property.countDocuments({
      ...query,
      rentOrSale: "Rent",
    });
    const vacantProperties = await Property.countDocuments({
      ...query,
      rentOrSale: { $ne: "Sale" },
      visible: true,
    });

    const properties = await Property.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    if (req.userId) {
      const userLikes = await Likes.find({ userId: req.userId }).select(
        "propertyId isLike"
      );
      const userLikesMap = {};
      userLikes.forEach((like) => {
        userLikesMap[like.propertyId.toString()] = like.isLike;
      });

      properties.forEach((property) => {
        property._doc.isLike = userLikesMap[property._id.toString()] || false;
      });
    }

    const totalPages = Math.ceil(totalProperties / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Get all properties successful",
      data: properties,
      meta: {
        totalProperties,
        saleProperties,
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

    if (req.userId) {
      const userLike = await Likes.findOne({
        userId: req.userId,
        propertyId: property._id,
      }).select("isLike");

      property._doc.isLike = userLike?.isLike || false;
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
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Main photo must be an image",
        });
      }

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
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "All slider photos must be images",
        });
      }

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
    const { property, user, date, time, agent, comment, contactNo } = req.body;

    let propertyIsExits = await Property.findById(property);
    if (!propertyIsExits) {
      return res.status(400).json({
        success: false,
        message: "Property not found",
      });
    }

    let userIsExits = await User.findOne({
      _id: user,
      $or: [{ isEmp: true }, { isUser: true }, { isProuser: true }],
    });
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
      contactNo,
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

    const totalAppointmentsCount = await Appointment.countDocuments();

    const appointments = await Appointment.find()
      .populate("property")
      .populate("user", "name email profileImage phoneNo")
      .populate("agent", "name email profileImage phoneNo")
      .populate("createdBy", "name email profileImage phoneNo")
      .skip(skip)
      .limit(pageSize);

    const totalPages = Math.ceil(totalAppointmentsCount / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Fetched all appointments successfully",
      data: appointments,
      meta: {
        totalAppointmentsCount,
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
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const totalAppointmentsCount = await Appointment.countDocuments({
      $or: [
        { user: req.userId },
        { agent: req.userId },
        { createdBy: req.userId },
      ],
    });

    const appointments = await Appointment.find({
      $or: [
        { user: req.userId },
        { agent: req.userId },
        { createdBy: req.userId },
      ],
    })
      .populate("property", "propertyName mainPhoto sliderPhotos propertyType")
      .populate("user", "name email profileImage phoneNo")
      .populate("agent", "name email profileImage phoneNo")
      .populate("createdBy", "name email profileImage phoneNo")
      .skip(skip)
      .limit(pageSize);

    const totalPages = Math.ceil(totalAppointmentsCount / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Appointment retrieved successfully",
      data: appointments,
      meta: {
        totalAppointmentsCount,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: appointments.length,
      },
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
    const topLikeProperties = await Likes.aggregate([
      { $group: { _id: "$propertyId", likeCount: { $sum: 1 } } },
      { $sort: { likeCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "properties",
          localField: "_id",
          foreignField: "_id",
          as: "propertyDetails",
        },
      },
      { $unwind: "$propertyDetails" },
      {
        $project: {
          _id: 0,
          likeCount: 1,
          propertyDetails: 1,
        },
      },
    ]);

    const saleProperties = await Property.aggregate([
      { $match: { rentOrSale: "Sale" } },
      {
        $group: {
          _id: "$_id",
          totalSalePrice: { $sum: "$price" },
          totalExpenses: { $sum: { $ifNull: ["$expenses", 0] } },
        },
      },
      {
        $lookup: {
          from: "properties",
          localField: "_id",
          foreignField: "_id",
          as: "propertyDetails",
        },
      },
      { $unwind: "$propertyDetails" },
      {
        $project: {
          _id: 0,
          totalSalePrice: 1,
          totalExpenses: 1,
          totalRevenue: { $subtract: ["$totalSalePrice", "$totalExpenses"] },
          totalIncome: { $add: ["$totalSalePrice"] },
          propertyDetails: 1,
        },
      },
    ]);

    const recentProperties = await Property.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    const totalProperties = await Property.countDocuments();
    const totalCustomers = await User.countDocuments({
      $or: [{ isEmp: true }, { isAgent: true }, { isProuser: true }],
    });
    const totalSale = await Property.countDocuments({ rentOrSale: "Sale" });
    const totalRent = await Property.countDocuments({ rentOrSale: "Rent" });
    const totalVacant = await Property.countDocuments({
      rentOrSale: { $ne: "Sale" },
      visible: true,
    });

    const totalRevenue = saleProperties.reduce(
      (total, property) => total + property.totalRevenue,
      0
    );
    const totalIncome = saleProperties.reduce(
      (total, property) => total + property.totalIncome,
      0
    );
    const totalExpenses = saleProperties.reduce(
      (total, property) => total + property.totalExpenses,
      0
    );

    const totalSocialSource = await Property.aggregate([
      {
        $group: {
          _id: null,
          totalSocialSource: { $sum: { $ifNull: ["$socialSource", 0] } },
        },
      },
    ]);
    const socialSourceCount = totalSocialSource[0]
      ? totalSocialSource[0].totalSocialSource
      : 0;

    const monthlyAnalytics = await Property.aggregate([
      { $match: { rentOrSale: "Sale" } },
      {
        $group: {
          _id: {
            month: { $month: "$updatedAt" },
            year: { $year: "$updatedAt" },
          },
          totalSalePrice: { $sum: "$price" },
          totalExpenses: { $sum: { $ifNull: ["$expenses", 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          totalSalePrice: 1,
          totalExpenses: 1,
          totalRevenue: { $subtract: ["$totalSalePrice", "$totalExpenses"] },
          totalIncome: { $add: ["$totalSalePrice"] },
        },
      },
    ]);

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthData = monthlyAnalytics.find(
        (data) => data.month === month
      ) || {
        month,
        totalSalePrice: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        totalIncome: 0,
      };
      return monthData;
    });

    res.status(200).json({
      success: true,
      message: "Get analytic data successful",
      saleProperties,
      topLikeProperties,
      recentProperties,
      totalProperties,
      totalCustomers,
      totalSale,
      totalRent,
      totalVacant,
      totalRevenue,
      totalIncome,
      totalExpenses,
      totalSocialSource: socialSourceCount,
      monthlyData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};

const getPropertyByAgentId = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Property.find({
      $or: [{ agent: id }, { createdBy: id }],
    });
    if (!property) {
      return (
        res.status(400),
        json({
          success: false,
          message: "Property not found",
        })
      );
    }
    return res.status(200).json({
      success: true,
      message: "Get properties by agent id successful",
      data: property,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error getting properties",
      error: error.message,
    });
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
  getPropertyByAgentId,
};
