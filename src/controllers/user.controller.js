const User_Model = require("../models/user.model");

const getAllAgents = async (req, res) => {
  try {
    const agents = await User_Model.find({ isAgent: true });
    return res.status(200).json({
      success: true,
      message: "Get agents successful",
      data: agents,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

module.exports = {
    getAllAgents,
};
