const User_Model = require("../models/user.model");

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default page 1, limit 10

    // Convert `page` and `limit` to integers
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    // Calculate the number of documents to skip
    const skip = (pageNumber - 1) * pageSize;

    // Get the total count of users
    const totalUsersCount = await User_Model.countDocuments();

    // Fetch the users with pagination
    const users = await User_Model.find().skip(skip).limit(pageSize);

    // Calculate total pages and remaining pages
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
        pageSize: users.length, // Actual number of results returned
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllUsers,
};
