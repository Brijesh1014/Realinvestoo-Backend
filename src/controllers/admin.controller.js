const User_Model = require("../models/user.model");
const { cloudinary } = require("../services/cloudinary.service");

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const skip = (pageNumber - 1) * pageSize;

    const totalUsersCount = await User_Model.countDocuments();

    const users = await User_Model.find().skip(skip).limit(pageSize);

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
    const user = await User_Model.findById(req.params.id);
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
    await User_Model.findByIdAndDelete(req.params.id);
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

module.exports = {
  getAllUsers,
  deleteUser,
  fetchAllUsers,
};
