const User_Model = require("../models/user.model");

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
      name,
      phoneNo,
      gender,
      profileImage,
      country,
      state,
      city,
      zipCode,
      reasonForJoining,
    } = req.body;

    let updateData = {
      name,
      phoneNo,
      gender,
      profileImage,
      country,
      state,
      city,
      zipCode,
      reasonForJoining,
    };

    if (req.isAdmin === true) {
      const { isAdmin, isAgent, isEmp, isProuser } = req.body;
      updateData = {
        ...updateData,
        isAdmin,
        isAgent,
        isEmp,
        isProuser,
      };
    }

    const profile = await User_Model.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error(error);
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

    if (req.isAdmin === true) {
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

    if (req.isEmp === true) {
      const user = await User_Model.findOne({
        _id: id,
        $or: [{ isEmp: true }, { isAgent: true }],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found or not an employee and agent",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Get user successful",
        data: user,
      });
    }

    return res.status(403).json({
      success: false,
      message: "You are not authorized to access this user data",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getAllAgents,
  editProfile,
  getUserById,
};
