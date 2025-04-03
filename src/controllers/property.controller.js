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
const PropertyListingType = require("../models/propertyListingType.model");
const PropertyType = require("../models/propertyType.model");

const createProperty = async (req, res) => {
  try {
    const {
      propertyName,
      propertyType,
      listingType,
      address,
      price,
      bedroom,
      bathroom,
      country,
      state,
      city,
      zipcode,
    } = req.body;

    const missingFields = [];
    if (!propertyName) missingFields.push("propertyName");
    if (!propertyType) missingFields.push("propertyType");
    if (!listingType) missingFields.push("listingType");
    if (!address) missingFields.push("address");
    if (!price) missingFields.push("price");
    if (!bedroom) missingFields.push("bedroom");
    if (!bathroom) missingFields.push("bathroom");
    if (!country) missingFields.push("country");
    if (!state) missingFields.push("state");
    if (!city) missingFields.push("city");
    if (!zipcode) missingFields.push("zipcode");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const existingPropertyType = await PropertyType.findById(propertyType);
    if (!existingPropertyType) {
      return res.status(400).json({
        success: false,
        message: "Invalid property type",
      });
    }

    const existingListingType = await PropertyListingType.findById(listingType);
    if (!existingListingType) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing type",
      });
    }

    if (req.body.agent) {
      const agentExists = await User.findOne({
        _id: req.body.agent,
        isAgent: true,
      });
      if (!agentExists) {
        return res.status(400).json({
          success: false,
          message: "Agent not found",
        });
      }
    }

    const propertyDetails = new Property({
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

const uploadFile = async (req, res) => {
  try {
    if (!req.files && !req.files.file && req.files.file.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    let fileUrls = [];
    const files = req.files.file;

    for (const doc of files) {
      const docUrl = await uploadToCloudinary(doc);
      fileUrls.push(docUrl);
    }

    return res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      fileUrls,
    });
  } catch (error) {
    console.error("File Upload Error:", error);
    return res.status(500).json({
      success: false,
      message: "File upload failed",
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
      .populate("propertyType")
      .populate("listingType")
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
    const property = await Property.findById(req.params.id)
      .populate("propertyType")
      .populate("listingType");

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
    const userId = req.userId;
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (property.createdBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this property.",
      });
    }

    if (req.body.propertyType) {
      const existingPropertyType = await PropertyType.findById(
        req.body.propertyType
      );
      if (!existingPropertyType) {
        return res.status(400).json({
          success: false,
          message: "Invalid property type",
        });
      }
    }

    if (req.body.listingType) {
      const existingListingType = await PropertyListingType.findById(
        req.body.listingType
      );
      if (!existingListingType) {
        return res.status(400).json({
          success: false,
          message: "Invalid listing type",
        });
      }
    }

    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Main photo must be an image",
        });
      }

      const existingMainPhotoPublicId = property.mainPhoto
        ?.split("/")
        .pop()
        .split(".")[0];

      if (existingMainPhotoPublicId) {
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
      { ...req.body },
      { new: true, runValidators: true }
    );

    const senderId = req.userId;
    const message = `The property "${property.propertyName}" has been updated. Check out the latest details!`;
    await FCMService.sendNotificationToAllUsers(
      senderId,
      property.propertyName,
      message
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
    await Likes.deleteMany({ propertyId: req.params.id });

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

const deleteFile = async (req, res) => {
  try {
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({
        success: false,
        message: "File URL is required",
      });
    }

    const urlParts = fileUrl.split("/");
    const fileNameWithVersion =
      urlParts[urlParts.length - 2] + "/" + urlParts[urlParts.length - 1];

    const publicId = fileNameWithVersion.replace(/^v\d+\//, "").split(".")[0];

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      return res.status(400).json({
        success: false,
        message: "Failed to delete file from Cloudinary",
      });
    }

    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("File Deletion Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete file",
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
    const { property, user, date, time, agent, comment, contactNo, alertType } =
      req.body;

    let propertyIsExits = await Property.findById(property);
    if (!propertyIsExits) {
      return res.status(400).json({
        success: false,
        message: "Property not found",
      });
    }

    let userIsExits = await User.findOne({
      _id: user,
      $or: [{ isSeller: true }, { isBuyer: true }],
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

    const conflictingAppointment = await Appointment.findOne({
      property,
      agent,
      date,
      time,
    });

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message:
          "An appointment already exists with the same property, agent, date, and time.",
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
      alertType,
    });

    await newAppointment.save();

    const propertyDetails = await Property.findById(property).lean();
    const notificationTitle = "New Appointment Scheduled";
    const notificationMessage = `An appointment with ${
      req.userId === user
        ? `Agent ${agentIsExits.name}`
        : req.userId === agent
        ? `User ${userIsExits.name}`
        : "the respective person"
    } has been scheduled for the property at ${
      propertyDetails.address
    } on ${date} at ${time}.`;

    if (req.userId !== user && userIsExits.fcmToken) {
      await FCMService.sendNotificationToUser(
        req.userId,
        userIsExits._id,
        notificationTitle,
        notificationMessage
      );
    }

    if (req.userId !== agent && agentIsExits.fcmToken) {
      await FCMService.sendNotificationToUser(
        req.userId,
        agentIsExits._id,
        notificationTitle,
        notificationMessage
      );
    }

    res.status(201).json({
      success: true,
      message: "Scheduled appointment successfully",
      data: newAppointment,
    });
  } catch (err) {
    console.error("Appointment creation error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message,
    });
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
      .limit(pageSize)
      .sort({ createdAt: -1 });

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
    const userId = req.userId;
    const updatedData = req.body;

    const existingAppointment = await Appointment.findById(id);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }
    if (existingAppointment.createdBy != userId) {
      return res.status(400).json({
        success: false,
        message: "You do not have permission to update the appointment.",
      });
    }

    const updatedFields = {};
    if (
      updatedData.date &&
      updatedData.date !== existingAppointment.date.toISOString().split("T")[0]
    ) {
      updatedFields.date = updatedData.date;
    }
    if (updatedData.time && updatedData.time !== existingAppointment.time) {
      updatedFields.time = updatedData.time;
    }
    if (
      updatedData.status &&
      updatedData.status !== existingAppointment.status
    ) {
      updatedFields.status = updatedData.status;
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    ).populate("property user agent");

    if (!updatedAppointment) {
      return res.status(404).json({
        success: false,
        message: "Failed to update appointment",
      });
    }

    const notificationTitle = "Appointment Updated";
    let notificationMessage = `The appointment for the property at ${
      updatedAppointment.property?.address || "unknown address"
    } has been updated.`;

    if (updatedFields.date || updatedFields.time) {
      notificationMessage += ` The new schedule is on ${
        updatedFields.date || updatedAppointment.date
      } at ${updatedFields.time || updatedAppointment.time}.`;
    }

    if (updatedFields.status) {
      notificationMessage += ` The status is now "${updatedFields.status}".`;
    }

    if (
      req.userId !== updatedAppointment.user._id.toString() &&
      updatedAppointment.user.fcmToken
    ) {
      await FCMService.sendNotificationToUser(
        req.userId,
        updatedAppointment.user._id,
        notificationTitle,
        notificationMessage
      );
    }

    if (
      req.userId !== updatedAppointment.agent._id.toString() &&
      updatedAppointment.agent.fcmToken
    ) {
      await FCMService.sendNotificationToUser(
        req.userId,
        updatedAppointment.agent._id,
        notificationTitle,
        notificationMessage
      );
    }

    return res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: updatedAppointment,
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
      $or: [{ isSeller: true }, { isAgent: true }, { isBuyer: true }],
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

const createPropertyListingType = async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const isExist = await PropertyListingType.findOne({ name });
    if (isExist) {
      return res.status(400).json({
        success: false,
        message: "Property Listing Type already exists",
      });
    }

    const propertyListingType = await PropertyListingType.create({
      name,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Property Listing Type created successfully",
      data: propertyListingType,
    });
  } catch (error) {
    console.error("Error creating property listing type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
const getAllPropertyListingTypes = async (req, res) => {
  try {
    const propertyListingTypes = await PropertyListingType.find();
    return res.status(200).json({
      success: true,
      data: propertyListingTypes,
      message: "Property listing types retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching property listing types:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching property listing types",
      error: error.message,
    });
  }
};
const updatePropertyListingType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const isExist = await PropertyListingType.findOne({ name });
    if (isExist && isExist.id !== id) {
      return res.status(400).json({
        success: false,
        message: "Property Listing Type with this name already exists",
      });
    }

    const propertyListingType = await PropertyListingType.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!propertyListingType) {
      return res.status(404).json({
        success: false,
        message: "Property Listing Type not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property Listing Type updated successfully",
      data: propertyListingType,
    });
  } catch (error) {
    console.error("Error updating property listing type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating property listing type",
      error: error.message,
    });
  }
};
const deletePropertyListingType = async (req, res) => {
  try {
    const { id } = req.params;

    const propertyListingType = await PropertyListingType.findById(id);
    if (!propertyListingType) {
      return res.status(404).json({
        success: false,
        message: "Property Listing Type not found",
      });
    }

    await Property.updateMany(
      { listingType: id },
      { $unset: { listingType: "" } }
    );

    await PropertyListingType.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Property Listing Type deleted successfully and removed from properties",
    });
  } catch (error) {
    console.error("Error deleting property listing type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting property listing type",
      error: error.message,
    });
  }
};

const getPropertyListingTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const propertyListingType = await PropertyListingType.findById(id);

    if (!propertyListingType) {
      return res.status(404).json({
        success: false,
        message: "Property Listing Type not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: propertyListingType,
      message: "Property Listing Type retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching property listing type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching property listing type",
      error: error.message,
    });
  }
};

const createPropertyType = async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const isExist = await PropertyType.findOne({ name });
    if (isExist) {
      return res.status(400).json({
        success: false,
        message: "Property Type already exists",
      });
    }

    const propertyType = await PropertyType.create({
      name,
      createdBy: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Property Type created successfully",
      data: propertyType,
    });
  } catch (error) {
    console.error("Error creating property type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllPropertyType = async (req, res) => {
  try {
    const propertyTypes = await PropertyType.find();
    return res.status(200).json({
      success: true,
      data: propertyTypes,
      message: "Property types retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching property types:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching property types",
      error: error.message,
    });
  }
};

const getPropertyTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const propertyType = await PropertyType.findById(id);

    if (!propertyType) {
      return res.status(404).json({
        success: false,
        message: "Property Type not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: propertyType,
      message: "Property type retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching property type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching property type",
      error: error.message,
    });
  }
};

const updatePropertyType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    let propertyType = await PropertyType.findById(id);
    if (!propertyType) {
      return res.status(404).json({
        success: false,
        message: "Property Type not found",
      });
    }

    const isExist = await PropertyType.findOne({ name });
    if (isExist && isExist.id !== id) {
      return res.status(400).json({
        success: false,
        message: "Property Type with this name already exists",
      });
    }

    propertyType = await PropertyType.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Property Type updated successfully",
      data: propertyType,
    });
  } catch (error) {
    console.error("Error updating property type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating property type",
      error: error.message,
    });
  }
};

const deletePropertyType = async (req, res) => {
  try {
    const { id } = req.params;

    const propertyType = await PropertyType.findById(id);
    if (!propertyType) {
      return res.status(404).json({
        success: false,
        message: "Property Type not found",
      });
    }

    await Property.updateMany(
      { propertyType: id },
      { $unset: { propertyType: "" } }
    );

    await PropertyType.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Property Type deleted successfully and removed from properties",
    });
  } catch (error) {
    console.error("Error deleting property type:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting property type",
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
  createPropertyListingType,
  getAllPropertyListingTypes,
  getPropertyListingTypeById,
  updatePropertyListingType,
  deletePropertyListingType,
  createPropertyType,
  getAllPropertyType,
  deletePropertyType,
  updatePropertyType,
  getPropertyTypeById,
  uploadFile,
  deleteFile,
};
