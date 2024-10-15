const User_Model = require("../models/user.model");

const getAllUsers = async (req, res) => {
  try {
    const users = await User_Model.find();
    return res.status(200).json({
      success: true,
      message: "Get users successful",
      data: users,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

module.exports = {
  getAllUsers,
};
