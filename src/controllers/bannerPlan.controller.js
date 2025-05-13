const BannerPlan = require("../models/bannerPlan.model");

const createBannerPlan = async (req, res) => {
  try {
    
    const bannerPlan = await BannerPlan.create(req.body);
    res.status(201).json({
      success: true,
      message: "Banner plan created successfully",
      data: bannerPlan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBannerPlans = async (req, res) => {
  try {
    const plans = await BannerPlan.find();
    res.status(200).json({
      success: true,
      message: "Banner plans retrieved successfully",
      data: plans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBannerPlanById = async (req, res) => {
  try {
    const plan = await BannerPlan.findById(req.params.id);
    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Banner plan not found" });
    }
    res.status(200).json({ success: true,      message: "Banner plan retrieved successfully", data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBannerPlan = async (req, res) => {
  try {
    const updatedPlan = await BannerPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedPlan) {
      return res
        .status(404)
        .json({ success: false, message: "Banner plan not found" });
    }

    res.status(200).json({
      success: true,
      message: "Banner plan updated successfully",
      data: updatedPlan,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBannerPlan = async (req, res) => {
  try {
    const deletedPlan = await BannerPlan.findByIdAndDelete(req.params.id);
    if (!deletedPlan) {
      return res
        .status(404)
        .json({ success: false, message: "Banner plan not found" });
    }

    res.status(200).json({
      success: true,
      message: "Banner plan deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


module.exports={
    createBannerPlan,
    getBannerPlanById,
    getBannerPlans,
    updateBannerPlan,
    deleteBannerPlan
}