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
const Amenities = require("../models/amenities.model");
const PropertyView = require("../models/propertyViewCount.model");
const BoostPlan = require("../models/boostPlan.model");
const PaymentHistory = require("../models/paymentHistory.model");
const createPaymentIntent = require("../utils/createPaymentIntent");
const SubscriptionService = require("../services/subscription.service");

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
      amenities,
      propertiesFacing,
      status,
    } = req.body;

    const missingFields = [];
    if (!propertyName) missingFields.push("propertyName");
    if (!propertyType) missingFields.push("propertyType");
    if (!listingType) missingFields.push("listingType");
    if (!country) missingFields.push("country");
    if (!state) missingFields.push("state");
    if (!city) missingFields.push("city");
    if (!zipcode) missingFields.push("zipcode");
    if (!amenities) missingFields.push("amenities");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isAdmin) {
      return createPropertyForAdmin(user, req, res);
    }

    if (user.isBuyer) {
      return res.status(403).json({
        success: false,
        message: "Buyers are not allowed to create properties.",
      });
    }

    if (user.status !== "Approved") {
      return res.status(403).json({
        success: false,
        message:
          "Your account must be approved before you can create a property.",
      });
    }

    const existingPropertyType = await PropertyType.findById(propertyType);
    if (!existingPropertyType) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid property type" });
    }

    const existingListingType = await PropertyListingType.findById(listingType);
    if (!existingListingType) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid listing type" });
    }

    const existingAmenities = await Amenities.find({ _id: { $in: amenities } });
    if (existingAmenities.length !== amenities.length) {
      return res.status(400).json({
        success: false,
        message: "One or more amenities are invalid",
        invalidAmenities: amenities.filter(
          (id) => !existingAmenities.find((a) => a._id.toString() === id)
        ),
      });
    }

    let propertyStatus = status;

    if (!propertyStatus) {
      propertyStatus = user.subscriptionPlanIsActive ? "Completed" : "Draft";
    }

    if (propertyStatus !== "Draft" && user.propertyLimit === 0) {
      propertyStatus = "Draft";
    }

    if (req.body.agent) {
      const agentExists = await User.findOne({
        _id: req.body.agent,
        isAgent: true,
      });
      if (!agentExists) {
        return res
          .status(400)
          .json({ success: false, message: "Agent not found" });
      }
    }

    const propertyDetails = new Property({
      createdBy: req.userId,
      status: propertyStatus,
      ...req.body,
    });

    const senderId = req.userId;
    const message = `Check out the latest property: ${propertyDetails.propertyName}`;
    await FCMService.sendNotificationToAdmin(
      senderId,
      propertyDetails.propertyName,
      message
    );

    const propertyData = await propertyDetails.save();

    const totalPropertiesCount = user.createdPropertiesCount || 0;
    user.createdPropertiesCount = totalPropertiesCount + 1;

    if (user.propertyLimit > 0 && propertyStatus !== "Draft") {
      user.propertyLimit -= 1;
    }
    await user.save();

    let responseMessage = "Property created successfully.";
    let additionalInfo = null;

    if (propertyStatus === "Draft") {
      responseMessage =
        "Property created successfully but set to Draft status.";
      additionalInfo = {
        reason:
          status === "Draft" ? "Requested as Draft" : "Property limit reached",
        currentLimit: user.propertyLimit,
        subscriptionActive: user.subscriptionPlanIsActive || false,
        upgradeTip:
          "Purchase a subscription plan to increase your property limit and activate Draft properties.",
      };
    }

    return res.status(201).json({
      success: true,
      message: responseMessage,
      data: propertyData,
      status: propertyStatus,
      additionalInfo,
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
const activateDraftToActive = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }
    if (!req.isAdmin) {
      if (property.createdBy.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to modify this property.",
        });
      }
    }

    if (property.status !== "Draft") {
      return res.status(400).json({
        success: false,
        message: "Only draft properties can be activated.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.subscriptionPlanIsActive) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have an active subscription. Please purchase a plan to activate this property.",
      });
    }

    if (user.propertyLimit <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Your property limit has been reached. Upgrade your subscription to activate more properties.",
      });
    }

    property.status = "Completed";
    await property.save();

    user.propertyLimit -= 1;
    user.createdPropertiesCount = (user.createdPropertiesCount || 0) + 1;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Property activated successfully.",
      data: property,
      remainingPropertyLimit: user.propertyLimit,
    });
  } catch (error) {
    console.error("Error activating draft property:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to activate property",
      error: error.message,
    });
  }
};

const createPropertyForAdmin = async (user, req, res) => {
  try {
    const propertyDetails = new Property({
      createdBy: req.userId,
      status: "Completed",
      ...req.body,
    });

    const senderId = req.userId;
    const message = `Check out the latest property: ${propertyDetails.propertyName}`;
    await FCMService.sendNotificationToAdmin(
      senderId,
      propertyDetails.propertyName,
      message
    );

    const propertyData = await propertyDetails.save();

    return res.status(201).json({
      success: true,
      message: "Property created successfully by admin.",
      data: propertyData,
    });
  } catch (error) {
    console.error("Error creating property for admin: ", error);
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
      bestOffer,
      upcoming,
      recommended,
      timeFilter,
      isFeatured,
      page = 1,
      limit = 10,
      rentOrSale,
      isLike,
      listingType,
      country,
      state,
      city,
      furnishingStatus,
      legalStatus,
      ownershipStatus,
      isBoost,
      status,
    } = req.query;

    const query = {};

    if (location) query.address = { $regex: location, $options: "i" };

    if (type) {
      const propertyTypeDoc = await PropertyType.findOne({
        name: new RegExp(`^${type}$`, "i"),
      });
      query.propertyType = propertyTypeDoc ? propertyTypeDoc._id : null;
      if (!propertyTypeDoc) query._id = { $in: [] };
    }

    if (listingType) {
      const propertyListingTypeDoc = await PropertyListingType.findOne({
        name: new RegExp(`^${listingType}$`, "i"),
      });
      query.listingType = propertyListingTypeDoc
        ? propertyListingTypeDoc._id
        : null;
      if (!propertyListingTypeDoc) query._id = { $in: [] };
    }

    if (amenities) {
      const amenityInputs = amenities.split(",").map((a) => a.trim());
      const isValidObjectIds = amenityInputs.every((id) =>
        /^[a-f\d]{24}$/i.test(id)
      );
      if (isValidObjectIds) {
        query.amenities = { $all: amenityInputs };
      } else {
        const regexArray = amenityInputs.map(
          (name) => new RegExp(`^${name}$`, "i")
        );
        const amenityDocs = await Amenities.find({ name: { $in: regexArray } });
        if (amenityDocs.length) {
          query.amenities = { $all: amenityDocs.map((doc) => doc._id) };
        } else {
          query._id = { $in: [] };
        }
      }
    }

    if (minPrice || maxPrice) {
      query.price = {
        $gte: parseFloat(minPrice) || 0,
        $lte: parseFloat(maxPrice) || 1000000,
      };
    }

    if (minSize || maxSize) {
      query.propertySize = {
        $gte: parseFloat(minSize) || 0,
        $lte: parseFloat(maxSize) || 1000000,
      };
    }

    if (bedrooms) query.bedroom = bedrooms;
    if (bathrooms) query.bathroom = bathrooms;
    if (kitchen) query.kitchen = kitchen;
    if (parking) query.parking = parking;
    if (legalStatus) query.legalStatus = legalStatus;
    if (ownershipStatus) query.ownershipStatus = ownershipStatus;

    if (search) {
      query.$or = [
        { propertyName: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    if (bestOffer) query.bestOffer = true;
    if (upcoming) query.new = true;
    if (recommended) query.recommended = true;
    if (isBoost) query.isBoost = true;

    if (isFeatured === "true") query.featured = true;
    else if (isFeatured === "false") query.featured = false;
    if (rentOrSale) {
      query.rentOrSale = rentOrSale;
    }

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

    if (country) query.country = { $regex: country, $options: "i" };
    if (state) query.state = { $regex: state, $options: "i" };
    if (city) query.city = { $regex: city, $options: "i" };

    if (furnishingStatus) {
      query.furnishingStatus = {
        $regex: `^${furnishingStatus}$`,
        $options: "i",
      };
    }

    const approvedUsers = await User.find({
      $or: [{ isAdmin: true }, { status: "Approved" }],
    }).select("_id");
    const approvedUserIds = approvedUsers.map((user) => user._id);

    if (status) query.status = status;
    query.ownerId = { $in: approvedUserIds };

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const totalProperties = await Property.countDocuments(query);
    const totalSold = await Property.countDocuments({ ...query, isSold: true });

    const saleCountAgg = await Property.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      { $match: { "listingTypeDetails.name": "Sale" } },
      { $count: "count" },
    ]);
    const saleProperties = saleCountAgg[0]?.count || 0;

    const rentCountAgg = await Property.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      { $match: { "listingTypeDetails.name": "Rent" } },
      { $count: "count" },
    ]);
    const rentProperties = rentCountAgg[0]?.count || 0;

    const vacantCountAgg = await Property.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      {
        $match: {
          "listingTypeDetails.name": { $ne: "Sale" },
          visible: true,
        },
      },
      { $count: "count" },
    ]);
    const vacantProperties = vacantCountAgg[0]?.count || 0;

    const properties = await Property.find(query)
      .skip(skip)
      .limit(pageSize)
      .populate("propertyType")
      .populate("listingType")
      .populate("createdBy")
      .populate("ownerId")
      .populate("agent")
      .populate("amenities")
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
    const remainingPages = Math.max(0, totalPages - pageNumber);

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
        totalSold,
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

const getTopRatedProperties = async (req, res) => {
  try {
    const now = new Date();
    const { propertyName } = req.query;

    const query = {
      isBoost: true,
      "boostPlan.expiryDate": { $gte: now },
      status: { $ne: "Draft" },
    };

    if (propertyName) {
      query.propertyName = { $regex: propertyName, $options: "i" };
    }

    const boostedProps = await Property.find(query)
      .populate("propertyType listingType amenities ownerId boostPlan.plan")
      .lean();

    if (boostedProps.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No boosted properties available",
        data: [],
      });
    }

    const dayIndex =
      Math.floor(now.getTime() / (1000 * 60 * 60 * 24)) % boostedProps.length;
    const rotatedList = [
      ...boostedProps.slice(dayIndex),
      ...boostedProps.slice(0, dayIndex),
    ];

    return res.status(200).json({
      success: true,
      message: "Top-rated boosted properties fetched successfully",
      data: rotatedList,
    });
  } catch (error) {
    console.error("Error fetching top-rated properties:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top-rated properties",
      error: error.message,
    });
  }
};

const getAllOwnProperties = async (req, res) => {
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
      listingType,
      country,
      state,
      city,
      furnishingStatus,
      legalStatus,
      ownershipStatus,
      status,
      isBoost,
    } = req.query;

    const userId = req.userId;
    const query = {};
    if (!req.isAdmin) {
      query.ownerId = userId;
    }

    if (location) query.address = { $regex: location, $options: "i" };

    if (type) {
      const typeDoc = await PropertyType.findOne({
        name: new RegExp(`^${type}$`, "i"),
      });
      if (typeDoc) query.propertyType = typeDoc._id;
      else query._id = { $in: [] };
    }

    if (listingType) {
      const listingTypeDoc = await PropertyListingType.findOne({
        name: new RegExp(`^${listingType}$`, "i"),
      });
      if (listingTypeDoc) query.listingType = listingTypeDoc._id;
      else query._id = { $in: [] };
    }

    if (amenities) {
      const amenityInputs = amenities.split(",").map((a) => a.trim());
      const isValidObjectIds = amenityInputs.every((id) =>
        /^[a-f\d]{24}$/i.test(id)
      );
      if (isValidObjectIds) {
        query.amenities = { $all: amenityInputs };
      } else {
        const regexArray = amenityInputs.map(
          (name) => new RegExp(`^${name}$`, "i")
        );
        const amenityDocs = await Amenities.find({ name: { $in: regexArray } });
        const ids = amenityDocs.map((doc) => doc._id);
        query.amenities = ids.length ? { $all: ids } : { $in: [] };
      }
    }

    if (minPrice || maxPrice)
      query.price = { $gte: minPrice || 0, $lte: maxPrice || Infinity };
    if (minSize || maxSize)
      query.propertySize = { $gte: minSize || 0, $lte: maxSize || Infinity };

    if (bedrooms) query.bedroom = bedrooms;
    if (bathrooms) query.bathroom = bathrooms;
    if (kitchen) query.kitchen = kitchen;
    if (parking) query.parking = parking;
    if (status) query.status = status;
    if (isBoost) query.isBoost = true;

    if (legalStatus) query.legalStatus = legalStatus;
    if (ownershipStatus) query.ownershipStatus = ownershipStatus;

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

    if (["Rent", "Sale", "PG"].includes(rentOrSale)) {
      query.rentOrSale = rentOrSale;
    }

    if (timeFilter) {
      const now = new Date();
      let startDate;
      if (timeFilter === "week")
        startDate = new Date(now.setDate(now.getDate() - 7));
      else if (timeFilter === "month")
        startDate = new Date(now.setMonth(now.getMonth() - 1));
      else if (timeFilter === "year")
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      if (startDate) query.createdAt = { $gte: startDate };
    }

    if (isLike && req.userId) {
      const userLikes = await Likes.find({
        userId: req.userId,
        isLike: true,
      }).select("propertyId");
      const likedIds = userLikes.map((l) => l.propertyId);
      if (isLike === "true") query._id = { $in: likedIds };
      else if (isLike === "false") query._id = { $nin: likedIds };
    }

    if (country) query.country = { $regex: country, $options: "i" };
    if (state) query.state = { $regex: state, $options: "i" };
    if (city) query.city = { $regex: city, $options: "i" };

    if (furnishingStatus)
      query.furnishingStatus = {
        $regex: `^${furnishingStatus}$`,
        $options: "i",
      };

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const [totalProperties, properties] = await Promise.all([
      Property.countDocuments(query),
      Property.find(query)
        .skip(skip)
        .limit(pageSize)
        .populate("propertyType")
        .populate("listingType")
        .populate("createdBy")
        .populate("ownerId")
        .populate("agent")
        .populate("amenities")
        .sort({ createdAt: -1 }),
    ]);
    const saleCountAgg = await Property.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      { $match: { "listingTypeDetails.name": "Sale" } },
      { $count: "count" },
    ]);
    const saleProperties = saleCountAgg[0]?.count || 0;

    const rentCountAgg = await Property.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      { $match: { "listingTypeDetails.name": "Rent" } },
      { $count: "count" },
    ]);
    const rentProperties = rentCountAgg[0]?.count || 0;

    const vacantCountAgg = await Property.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      {
        $match: {
          "listingTypeDetails.name": { $ne: "Sale" },
          visible: true,
        },
      },
      { $count: "count" },
    ]);
    const vacantProperties = vacantCountAgg[0]?.count || 0;
    const totalSold = await Property.countDocuments({ ...query, isSold: true });
    if (req.userId) {
      const userLikes = await Likes.find({ userId: req.userId }).select(
        "propertyId isLike"
      );
      const likeMap = {};
      userLikes.forEach(
        (like) => (likeMap[like.propertyId.toString()] = like.isLike)
      );
      properties.forEach((p) => {
        p._doc.isLike = likeMap[p._id.toString()] || false;
      });
    }

    const totalPages = Math.ceil(totalProperties / pageSize);
    const remainingPages = Math.max(0, totalPages - pageNumber);

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
        totalSold,
      },
    });
  } catch (error) {
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
      .populate("listingType")
      .populate("agent")
      .populate("amenities")
      .populate("createdBy")
      .populate("ownerId");

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (req.userId) {
      const existingView = await PropertyView.findOne({
        userId: req.userId,
        propertyId: property._id,
      });

      if (!existingView) {
        await PropertyView.create({
          userId: req.userId,
          propertyId: property._id,
        });

        property.viewCount = (property.viewCount || 0) + 1;
        await property.save();
      }

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

    if (
      !req.isAdmin &&
      property.createdBy.toString() !== userId &&
      property.ownerId.toString() !== userId
    ) {
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

    property = await Property.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );

    const message = `The property "${property.propertyName}" has been updated. Check out the latest details!`;

    const likedUsers = await Likes.find({
      propertyId: property._id,
      isLike: true,
    }).select("userId");

    for (const like of likedUsers) {
      await FCMService.sendNotificationToUser(
        req.userId,
        like.userId,
        property.propertyName,
        message
      );
    }

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

const removePropertyImages = async (req, res) => {
  try {
    const {
      id,
      sliderPhotos = [],
      floorPlanUpload = [],
      propertyDocuments = [],
      mainPhoto,
    } = req.body;

    const existingProperty = await Property.findById(id);
    if (!existingProperty) {
      return res.status(404).json({ message: "Property not found" });
    }

    const deleteFromCloudinary = async (imageUrl) => {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    };

    if (Array.isArray(sliderPhotos) && sliderPhotos.length > 0) {
      for (const image of sliderPhotos) {
        await deleteFromCloudinary(image);
      }
      await Property.updateOne(
        { _id: id },
        { $pull: { sliderPhotos: { $in: sliderPhotos } } }
      );
    }

    if (Array.isArray(floorPlanUpload) && floorPlanUpload.length > 0) {
      for (const image of floorPlanUpload) {
        await deleteFromCloudinary(image);
      }
      await Property.updateOne(
        { _id: id },
        { $pull: { floorPlanUpload: { $in: floorPlanUpload } } }
      );
    }

    if (Array.isArray(propertyDocuments) && propertyDocuments.length > 0) {
      for (const image of propertyDocuments) {
        await deleteFromCloudinary(image);
      }
      await Property.updateOne(
        { _id: id },
        { $pull: { propertyDocuments: { $in: propertyDocuments } } }
      );
    }

    if (mainPhoto && typeof mainPhoto === "string") {
      await deleteFromCloudinary(mainPhoto);
      await Property.updateOne({ _id: id }, { $unset: { mainPhoto: "" } });
    }

    return res
      .status(200)
      .json({ success: true, message: "Images removed successfully" });
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
    // Get the user who created the property
    const user = await User.findById(property.createdBy);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Property owner not found",
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

    // If this is an active property, increment the user's property limit
    // We only increment if the property is active, as draft properties don't count against the limit
    if (property.status === "Completed") {
      // Calculate the max limit based on role and subscription
      const baseLimit = user.isAgent ? 5 : user.isSeller ? 3 : 1;
      const maxLimit = user.subscriptionPlanIsActive
        ? baseLimit + 10
        : baseLimit; // Assuming max 10 additional properties from subscriptions

      // Only increment if we're not already at the maximum limit
      if (user.propertyLimit < maxLimit) {
        user.propertyLimit += 1;
        console.log(
          `Increased property limit for user ${user._id} to ${user.propertyLimit} after deleting an active property`
        );
        await user.save();
      }
    }

    // Decrement the total properties count for the user
    if (user.createdPropertiesCount > 0) {
      user.createdPropertiesCount -= 1;
      await user.save();
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
    const baseQuery = { status: { $ne: "Draft" } };

    const approvedUsers = await User.find({
      $or: [{ isAdmin: true }, { status: "Approved" }],
    }).select("_id");
    const approvedUserIds = approvedUsers.map((user) => user._id);

    baseQuery.createdBy = { $in: approvedUserIds };

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
      { $match: { "propertyDetails.status": { $ne: "Draft" } } },
      {
        $project: {
          _id: 0,
          likeCount: 1,
          propertyDetails: 1,
        },
      },
    ]);

    const saleProperties = await Property.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      { $match: { "listingTypeDetails.name": "Sale" } },
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

    const recentProperties = await Property.find(baseQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("propertyType listingType agent createdBy amenities");

    const totalProperties = await Property.countDocuments(baseQuery);
    const totalSold = await Property.countDocuments({
      ...baseQuery,
      isSold: true,
    });

    const totalCustomers = await User.countDocuments({
      $or: [{ isSeller: true }, { isAgent: true }, { isBuyer: true }],
    });

    const totalUsers = await User.countDocuments();
    const totalBuyers = await User.countDocuments({ isBuyer: true });
    const totalSellers = await User.countDocuments({ isSeller: true });
    const totalAgents = await User.countDocuments({ isAgent: true });
    const activeUsers = await User.countDocuments({ status: "Approved" });

    const totalSaleQuery = await Property.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      { $match: { "listingTypeDetails.name": "Sale" } },
      { $count: "count" },
    ]);
    const totalSale = totalSaleQuery.length > 0 ? totalSaleQuery[0].count : 0;

    const totalRentQuery = await Property.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      { $match: { "listingTypeDetails.name": "Rent" } },
      { $count: "count" },
    ]);
    const totalRent = totalRentQuery.length > 0 ? totalRentQuery[0].count : 0;

    const totalVacantQuery = await Property.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      {
        $match: {
          "listingTypeDetails.name": { $ne: "Sale" },
          visible: true,
        },
      },
      { $count: "count" },
    ]);
    const totalVacant = totalVacantQuery[0]?.count || 0;

    const totalSocialSource = await Property.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          totalSocialSource: { $sum: { $ifNull: ["$socialSource", 0] } },
        },
      },
    ]);
    const socialSourceCount = totalSocialSource[0]?.totalSocialSource || 0;

    const monthlyAnalytics = await Property.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: "propertylistingtypes",
          localField: "listingType",
          foreignField: "_id",
          as: "listingTypeDetails",
        },
      },
      { $unwind: "$listingTypeDetails" },
      { $match: { "listingTypeDetails.name": "Sale" } },
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

    const { months = [], years = [], startCustom, endCustom } = req.body;

    const monthMap = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      March: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const filterBySelectedMonths = (dataArray, selectedMonths) =>
      selectedMonths.map((month) => {
        const index = monthMap[month];
        return index !== undefined ? dataArray[index] : 0;
      });

    const monthlyPayments = await PaymentHistory.aggregate([
      {
        $match: {
          status: "succeeded",
          createdAt: {
            $gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            related_type: "$related_type",
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthlyEarnings = {
      boost: Array(12).fill(0),
      banner: Array(12).fill(0),
      subscription: Array(12).fill(0),
    };
    const monthlyPurchases = {
      boost: Array(12).fill(0),
      banner: Array(12).fill(0),
      subscription: Array(12).fill(0),
    };

    monthlyPayments.forEach((item) => {
      const monthIndex = item._id.month - 1;
      const type = item._id.related_type;
      if (type && monthIndex >= 0 && monthIndex < 12) {
        monthlyEarnings[type][monthIndex] = item.totalAmount;
        monthlyPurchases[type][monthIndex] = item.count;
      }
    });

    const yearlyPayments = await PaymentHistory.aggregate([
      {
        $match: { status: "succeeded" },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            related_type: "$related_type",
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const yearlyEarnings = {
      boost: Array(years.length).fill(0),
      banner: Array(years.length).fill(0),
      subscription: Array(years.length).fill(0),
    };
    const yearlyPurchases = {
      boost: Array(years.length).fill(0),
      banner: Array(years.length).fill(0),
      subscription: Array(years.length).fill(0),
    };

    yearlyPayments.forEach((item) => {
      const yearIndex = years.indexOf(item._id.year);
      const type = item._id.related_type;
      if (type && yearIndex !== -1) {
        yearlyEarnings[type][yearIndex] = item.totalAmount;
        yearlyPurchases[type][yearIndex] = item.count;
      }
    });

    const startDate = startCustom ? new Date(startCustom) : new Date();
    const endDate = endCustom ? new Date(endCustom) : new Date();

    const generateDateRange = (start, end) => {
      const dates = [];
      const current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const customLabels = generateDateRange(startDate, endDate);

    const customPayments = await PaymentHistory.aggregate([
      {
        $match: {
          status: "succeeded",
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            related_type: "$related_type",
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const customEarnings = {
      boost: Array(customLabels.length).fill(0),
      banner: Array(customLabels.length).fill(0),
      subscription: Array(customLabels.length).fill(0),
    };
    const customPurchases = {
      boost: Array(customLabels.length).fill(0),
      banner: Array(customLabels.length).fill(0),
      subscription: Array(customLabels.length).fill(0),
    };

    customPayments.forEach((item) => {
      const index = customLabels.indexOf(item._id.date);
      const type = item._id.related_type;
      if (type && index !== -1) {
        customEarnings[type][index] = item.totalAmount;
        customPurchases[type][index] = item.count;
      }
    });

    const earningsData = {
      monthly: {
        labels: months,
        boost: filterBySelectedMonths(monthlyEarnings.boost, months),
        banner: filterBySelectedMonths(monthlyEarnings.banner, months),
        subscription: filterBySelectedMonths(
          monthlyEarnings.subscription,
          months
        ),
      },
      yearly: {
        labels: years.map(String),
        boost: yearlyEarnings.boost,
        banner: yearlyEarnings.banner,
        subscription: yearlyEarnings.subscription,
      },
      custom: {
        labels: customLabels,
        boost: customEarnings.boost,
        banner: customEarnings.banner,
        subscription: customEarnings.subscription,
      },
    };

    const planPurchaseData = {
      monthly: {
        labels: months,
        boost: filterBySelectedMonths(monthlyPurchases.boost, months),
        banner: filterBySelectedMonths(monthlyPurchases.banner, months),
        subscription: filterBySelectedMonths(
          monthlyPurchases.subscription,
          months
        ),
      },
      yearly: {
        labels: years.map(String),
        boost: yearlyPurchases.boost,
        banner: yearlyPurchases.banner,
        subscription: yearlyPurchases.subscription,
      },
      custom: {
        labels: customLabels,
        boost: customPurchases.boost,
        banner: customPurchases.banner,
        subscription: customPurchases.subscription,
      },
    };

    // ✅ New totalRevenue from PaymentHistory (status: succeeded)
    const totalRevenueResult = await PaymentHistory.aggregate([
      {
        $match: { status: "succeeded" },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
        },
      },
    ]);
    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;

    res.status(200).json({
      success: true,
      message: "Get analytic data successfully",
      saleProperties,
      topLikeProperties,
      recentProperties,
      totalProperties,
      totalCustomers,
      totalSale,
      totalRent,
      totalVacant,
      totalSold,
      totalRevenue, // <-- From PaymentHistory
      totalIncome: 0,
      totalExpenses: 0,
      totalSocialSource: socialSourceCount,
      earningsData,
      planPurchaseData,
      totalUsers,
      totalBuyers,
      totalSellers,
      totalAgents,
      activeUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
};

module.exports = analyticDashboard;

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
    const { search } = req.query;
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    const propertyListingTypes = await PropertyListingType.find(query);
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
    const { search } = req.query;
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    const propertyTypes = await PropertyType.find(query);
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

const boostProperty = async (req, res) => {
  try {
    const { boostPlanId, propertyId } = req.body;
    const userId = req.userId;

    if (!boostPlanId || !propertyId) {
      return res.status(400).json({
        success: false,
        message: "boostPlanId and propertyId are required.",
      });
    }

    const plan = await BoostPlan.findById(boostPlanId);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Boost plan not found." });

    const property = await Property.findById(propertyId);
    if (!property)
      return res
        .status(404)
        .json({ success: false, message: "Property not found." });

    if (property.isBoost) {
      return res.status(200).json({
        success: true,
        message: "This property is already boosted.",
        data: {
          propertyId,
          boostPlanId,
        },
      });
    }

    const { clientSecret, stripePaymentIntentId, stripeCustomerId } =
      await createPaymentIntent({
        userId,
        amount: plan.offerPrice || plan.price,
        relatedType: "boost",
        metadata: {
          propertyId,
          boostPlanId,
        },
      });

    await PaymentHistory.create({
      userId: userId,
      related_type: "boost",
      boostProperty: propertyId,
      boostPlanId: boostPlanId,
      stripe_customer_id: stripeCustomerId,
      stripe_payment_intent_id: stripePaymentIntentId,
      amount: plan.offerPrice,
      currency: "inr",
      status: "pending",
      metadata: { boostPlanId },
    });

    return res.status(200).json({
      success: true,
      message: "Payment intent created for boosting property.",
      data: {
        clientSecret,
        propertyId,
        boostPlanId,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
  uploadNewSliderPhoto,
  removePropertyImages,
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
  getAllOwnProperties,
  boostProperty,
  getTopRatedProperties,
  activateDraftToActive,
};
