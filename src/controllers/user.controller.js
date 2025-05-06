const User_Model = require("../models/user.model");
const {
  uploadToCloudinary,
  cloudinary,
} = require("../services/cloudinary.service");
const FCMService = require("../services/notification.service");

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

    if (req.isAdmin) {
      const user = await User_Model.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Get user successful",
        data: user,
      });
    }

    const user = await User_Model.findOne({
      _id: id,
      $or: [{ isSeller: true }, { isBuyer: true }, { isAgent: true }],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not in allowed roles",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get user successful",
      data: user,
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


module.exports = {
  getAllAgents,
  editProfile,
  getUserById,
  uploadDocument,
};
