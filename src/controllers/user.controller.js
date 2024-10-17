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

module.exports = {
  getAllAgents,
};
