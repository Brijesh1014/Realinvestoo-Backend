const Property = require("../models/property.model");
const User_Model = require("../models/user.model");
const {
  uploadToCloudinary,
  cloudinary,
} = require("../services/cloudinary.service");
const FCMService = require("../services/notification.service");
const PaymentHistory = require("../models/paymentHistory.model");

const getAllAgents = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const skip = (pageNumber - 1) * pageSize;

    const totalAgentsCount = await User_Model.countDocuments({ isAgent: true });
    const agents = await User_Model.find({ isAgent: true })
      .skip(skip)
      .limit(pageSize);

    const totalPages = Math.ceil(totalAgentsCount / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Get agents successful",
      data: agents,
      meta: {
        totalAgentsCount,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: agents.length,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
const editProfile = async (req, res) => {
  try {
    const {
      id, // The user ID being updated
      name,
      phoneNo,
      gender,
      country,
      state,
      city,
      zipCode,
      reasonForJoining,
      username,
      isAdmin,
      isAgent,
      isBuyer,
      isSeller,
      firstName,
      lastName,
      countryCode,
      dob,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    let updateData = {
      name,
      phoneNo,
      gender,
      country,
      state,
      city,
      zipCode,
      reasonForJoining,
      username,
      dob,
      firstName,
      lastName,
      countryCode
    };

    let profileImageUrl;

    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "The uploaded file must be an image",
        });
      }

      const existingProfile = await User_Model.findById(id);
      if (!existingProfile) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (existingProfile.profileImage) {
        const existingImagePublicId = existingProfile.profileImage
          .split("/")
          .pop()
          .split(".")[0];

        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          public_id: existingImagePublicId,
          overwrite: true,
        });

        profileImageUrl = uploadResult.secure_url;
      } else {
        const uploadResult = await uploadToCloudinary(req.file);
        profileImageUrl = uploadResult;
      }

      updateData.profileImage = profileImageUrl;
    }

    if (req.isAdmin === true) {
      console.log("comes");

      const roles = {
        isAdmin: isAdmin === "true" || isAdmin === true,
        isAgent: isAgent === "true" || isAgent === true,
        isBuyer: isBuyer === "true" || isBuyer === true,
        isSeller: isSeller === "true" || isSeller === true,
      };

      const providedRoles = Object.entries(roles).filter(
        ([_, value]) => Boolean(value) === true
      );

      if (providedRoles.length > 1) {
        return res.status(400).json({
          success: false,
          message: "Only one role can be set to 'true' at a time.",
        });
      }

      if (providedRoles.length === 1) {
        const [role] = providedRoles[0];

        const userToUpdate = await User_Model.findById(id);
        if (!userToUpdate) {
          return res
            .status(404)
            .json({ success: false, message: "User not found" });
        }

        updateData = {
          ...updateData,
          isAdmin: false,
          isAgent: false,
          isBuyer: false,
          isSeller: false,
          [role]: true,
        };
      }
    }

    const updatedProfile = await User_Model.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.isAdmin;

    const baseQuery = { _id: id };
    if (!isAdmin) {
      baseQuery.$or = [
        { isSeller: true },
        { isBuyer: true },
        { isAgent: true }
      ];
    }

    let user = await User_Model.findOne(baseQuery)
      .populate({ path: 'subscription.plan', model: 'SubscriptionPlan' });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found" + (!isAdmin ? " or not in allowed roles" : ""),
      });
    }

    if (user.properties?.length > 0) {
      await user.populate('properties');
    }

    const paymentHistory = await PaymentHistory.find({
      userId: id,
      status: 'succeeded'
    })
      .populate('banner')
      .populate('boostPlanId')
      .populate('subscriptionProperty')
      .sort({ createdAt: -1 });

    const groupPlans = (type) => paymentHistory.filter(plan => plan.related_type === type);
    const isActive = (item) => item.end_date && new Date(item.end_date) > new Date();

    const banners = groupPlans('banner');
    const boosts = groupPlans('boost');
    const subscriptions = groupPlans('subscription');

    const activeBanners = banners.filter(isActive);
    const activeBoosts = boosts.filter(isActive);
    const activeSubscriptions = subscriptions.filter(isActive);

    const subscriptionUsage = {
      propertyLimit: user.propertyLimit || 0,
      totalProperties: user.properties?.length || 0,
      activeProperties: user.properties?.filter(p => p.status === 'Active').length || 0,
      draftProperties: user.properties?.filter(p => p.status === 'Draft').length || 0
    };

    return res.status(200).json({
      success: true,
      message: "Get user successful",
      data: {
        ...user.toObject(),
        purchasedPlans: {
          banners,
          activeBanners,
          boosts,
          activeBoosts,
          subscriptions,
          activeSubscriptions,
          subscriptionUsage,
          allPlans: paymentHistory
        }
      }
    });

  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const id = req.userId;

    const user = await User_Model.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.document) {
      return res.status(400).json({
        success: false,
        message: "Document already uploaded",
      });
    }

    let documentUrl = null;
    if (req.file) {
      documentUrl = await uploadToCloudinary(req.file);
    }

    if (!documentUrl) {
      return res.status(400).json({
        success: false,
        message: "No document file uploaded",
      });
    }

    const senderId = req.userId;
    const notificationMessage = `Please review and approve or decline the request for ${user.name}.`;

    await FCMService.sendNotificationToAdmin(
      senderId,
      user.name,
      notificationMessage
    );

    user.document = documentUrl;

    if (user.status === "Rejected") {
      user.status = "Re-Upload";
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
      error: error.message,
    });
  }
};



const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.userId; 

    const { related_type, status } = req.query;

    const filter = { userId: userId };

    if (related_type) filter.related_type = related_type;
    if (status) filter.status = status;

    const history = await PaymentHistory.find(filter)
      .populate("banner", "title image") 
      .populate("boostProperty", "propertyName mainPhoto")
      .populate("subscriptionProperty", "name") 
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Payment history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error("Error fetching payment history:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const getUserBoostedProperties = async (req, res) => {
  try {
    const userId  = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;


    const filter = {
      isBoost: true,
        ...(userId && { createdBy: userId }),
    };

    const skip = (page - 1) * limit;

    const [total, boostedProperties] = await Promise.all([
      Property.countDocuments(filter),
      Property.find(filter)
        .populate("propertyType", "name")
        .populate("listingType", "name")
        .populate("createdBy", "firstName lastName email")
        .populate("boostPlan.plan", "title price duration")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    const totalPages = Math.ceil(total / limit);
      if (!boostedProperties.length) {
    return res.status(404).json({
      success: false,
      message: "No boosted properties found for the given criteria.",
    });
  }

    return res.status(200).json({
      success: true,
      message: "Boosted properties fetched successfully.",
      data: boostedProperties,
      pagination: {
        totalItems: total,
        currentPage: page,
        totalPages,
        perPage: limit,
      },
    });
  } catch (error) {
    console.error("Error fetching boosted properties:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




module.exports = {
  getAllAgents,
  editProfile,
  getUserById,
  uploadDocument,
  getPaymentHistory,
  getUserBoostedProperties
};
