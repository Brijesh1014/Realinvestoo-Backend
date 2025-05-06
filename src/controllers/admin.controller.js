const User_Model = require("../models/user.model");
const Property_Model = require("../models/property.model");
const { cloudinary } = require("../services/cloudinary.service");
const FCMService = require("../services/notification.service");

const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      isAdmin,
      isAgent,
      isBuyer,
      isSeller,
      gender,
      country,
      state,
      city,
    } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const searchRegex = new RegExp(search, "i");
    const searchQuery = search
      ? {
          $or: [
            { name: searchRegex },
            { email: searchRegex },
            { username: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex },
          ],
        }
      : {};

    const filters = {};
    if (isAdmin !== undefined) filters.isAdmin = isAdmin === "true";
    if (isAgent !== undefined) filters.isAgent = isAgent === "true";
    if (isBuyer !== undefined) filters.isBuyer = isBuyer === "true";
    if (isSeller !== undefined) filters.isSeller = isSeller === "true";
    if (gender) filters.gender = gender;
    if (country) filters.country = country;
    if (state) filters.state = state;
    if (city) filters.city = city;

    const query = { ...searchQuery, ...filters };

    const totalUsersCount = await User_Model.countDocuments(query);
    const users = await User_Model.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalUsersCount / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Get users successful",
      data: users,
      meta: {
        totalUsersCount,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: users.length,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User_Model.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.profileImage) {
      const profileImagePublicId = user.profileImage
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(profileImagePublicId);
    }

    await Property_Model.deleteMany({ createdBy: id });
    await User_Model.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting User: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete User",
      error: error.message,
    });
  }
};

const fetchAllUsers = async (req, res) => {
  try {
    const users = await User_Model.find();
    return res.status(200).json({
      success: true,
      message: "Fetch all user successful",
      data: users,
    });
  } catch (error) {
    console.error("Error fetching Users: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetching Users",
      error: error.message,
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;
    const adminId = req.userId;
    const { status, reason } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'Approved' or 'Rejected'",
      });
    }

    const adminUser = await User_Model.findById(adminId);
    if (!adminUser?.isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "You do not have permission to perform this action" });
    }

    const user = await User_Model.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.isAdmin) {
      return res
        .status(400)
        .json({ success: false, message: "Admin status cannot be updated" });
    }

    if (user.status === status) {
      return res
        .status(400)
        .json({
          success: false,
          message: `User is already ${status.toLowerCase()}`,
        });
    }

    if (status === "Approved" && !user.document) {
      return res
        .status(400)
        .json({ success: false, message: "Document not uploaded" });
    }

    user.status = status;
    
    if (status === "Rejected") {
      user.rejectReason = reason || "";
      if (user.document) {
        user.document = null;
      }
    } else if (status === "Approved") {
      user.rejectReason = null;
    }

    await user.save();

    const notificationTitle = `Account ${status}`;
    let notificationMessage;
    
    if (status === "Approved") {
      notificationMessage = "Your account has been approved! You can now add properties.";
    } else {
      notificationMessage = reason
        ? `Your account has been rejected. Reason: ${reason}` 
        : "Your account has been rejected. Please contact support or upload correct documents.";
    }

    await FCMService.sendNotificationToUser(
      adminId,
      user._id,
      notificationTitle,
      notificationMessage
    );

    return res.status(200).json({
      success: true,
      message: `User ${status.toLowerCase()} successfully`,
      data: user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message,
    });
  }
};

const getPendingDocumentUsers = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, search } = req.query;

    const skip = (page - 1) * pageSize;
    const query = {
      status: "Pending",
      document: { $exists: true, $ne: "" },
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const total = await User_Model.countDocuments(query);
    const users = await User_Model.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(pageSize));

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / pageSize),
      totalUsers: total,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  fetchAllUsers,
  updateUserStatus,
  getPendingDocumentUsers,
};
