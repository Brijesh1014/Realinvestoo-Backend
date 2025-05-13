const BoostPlan = require("../models/boostPlan.model");

const createBoostPlan = async (req, res) => {
  try {
    const plan = new BoostPlan(req.body);
    await plan.save();
    return res.status(201).json({ success:true, message: "Boost plan created successfully", data: plan });
  } catch (error) {
    return res.status(500).json({success:false, message: "Failed to create boost plan", error: error.message });
  }
};

const getAllBoostPlans = async (req, res) => {
  try {
    const plans = await BoostPlan.find().sort({ createdAt: -1 });
    return res.status(200).json({success:true, message: "Boost plans fetched successfully", data: plans });
  } catch (error) {
    return res.status(500).json({success:false, message: "Failed to fetch boost plans", error: error.message });
  }
};

const getBoostPlanById = async (req, res) => {
  try {
    const plan = await BoostPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({success:false, message: "Boost plan not found" });

    return res.status(200).json({success:true, message: "Boost plan fetched successfully", data: plan });
  } catch (error) {
    return res.status(500).json({success:false, message: "Failed to fetch boost plan", error: error.message });
  }
};

const updateBoostPlan = async (req, res) => {
  try {
    const updatedPlan = await BoostPlan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedPlan) return res.status(404).json({success:false, message: "Boost plan not found" });

    return res.status(200).json({success:true, message: "Boost plan updated successfully", data: updatedPlan });
  } catch (error) {
    return res.status(500).json({success:false, message: "Failed to update boost plan", error: error.message });
  }
};

const deleteBoostPlan = async (req, res) => {
  try {
    const deleted = await BoostPlan.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({success:false, message: "Boost plan not found" });

    return res.status(200).json({success:true, message: "Boost plan deleted successfully" });
  } catch (error) {
    return res.status(500).json({success:false, message: "Failed to delete boost plan", error: error.message });
  }
};


module.exports = {
    createBoostPlan,
    getAllBoostPlans,
    getBoostPlanById,
    updateBoostPlan,
    deleteBoostPlan
}