const SubscriptionPlan = require("../models/subscriptionPlan.model");

const createSubscriptionPlan = async (req, res) => {
  try {
    const plan = new SubscriptionPlan(req.body);
    await plan.save();
    res.status(201).json({ success :true,message: "Subscription plan created successfully", plan });
  } catch (error) {
    res.status(500).json({success:false, message: "Failed to create subscription plan", error: error.message });
  }
};

const getAllSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.status(200).json({success:true, message: "Fetched all subscription plans", plans });
  } catch (error) {
    res.status(500).json({success:false, message: "Failed to fetch subscription plans", error: error.message });
  }
};

const getSubscriptionPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({success:false, message: "Subscription plan not found" });

    res.status(200).json({success:true, message: "Fetched subscription plan", plan });
  } catch (error) {
    res.status(500).json({success:false, message: "Failed to fetch subscription plan", error: error.message });
  }
};

const updateSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) return res.status(404).json({ success:false,message: "Subscription plan not found" });

    res.status(200).json({success:true, message: "Subscription plan updated successfully", plan });
  } catch (error) {
    res.status(500).json({ success:false,message: "Failed to update subscription plan", error: error.message });
  }
};

const deleteSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan) return res.status(404).json({success:false, message: "Subscription plan not found" });

    res.status(200).json({success:true, message: "Subscription plan deleted successfully" });
  } catch (error) {
    res.status(500).json({success:true, message: "Failed to delete subscription plan", error: error.message });
  }
};

module.exports={
    createSubscriptionPlan,
    getAllSubscriptionPlans,
    getSubscriptionPlanById,
    updateSubscriptionPlan,
    deleteSubscriptionPlan
}