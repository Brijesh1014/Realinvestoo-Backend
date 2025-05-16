const SubscriptionPlan = require("../models/subscriptionPlan.model");
const PaymentHistory = require("../models/paymentHistory.model");
const createStripeSubscription = require("../utils/createStripeSubscription");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const createSubscriptionPlan = async (req, res) => {
  try {
    const { name, price, duration, description } = req.body;

    const stripeProduct = await stripe.products.create({
      name,
      description: description || "",
    });

    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(price * 100),
      currency: "usd",
      recurring: {
        interval: "month",
        interval_count: duration || 1,
      },
      product: stripeProduct.id,
    });

    const plan = new SubscriptionPlan({
      ...req.body,
      stripePriceId: stripePrice.id,
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: "Subscription plan created successfully",
      plan,
    });
  } catch (error) {
    console.error("Error creating subscription plan:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create subscription plan",
      error: error.message,
    });
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

const purchaseSubscribePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.userId;

    const plan = await SubscriptionPlan.findById({_id:planId});
    
    if (!plan || !plan.stripePriceId) {
      return res.status(400).json({success:false, message: "Invalid plan or stripe in not add a plan" });
    }

    const result = await createStripeSubscription({
      userId,
      priceId: plan.stripePriceId,
      metadata: { planId },
    });

    await PaymentHistory.create({
      user_id: userId,
      related_type: "subscription",
      SubscriptionProperty: planId,
      stripe_customer_id: result.stripeCustomerId,
      stripe_payment_intent_id: result.clientSecret,
      stripe_subscription_id: result.stripeSubscriptionId,
      amount: plan.price,
      status: "pending",
    });

    res
      .status(200)
      .json({
        success: true,
        message: "Payment intent created for subscribe plan.",
        clientSecret: result.clientSecret,
        stripeSubscriptionId:result.stripeSubscriptionId,
        isSetupIntent:result.isSetupIntent,
        stripeCustomerId:result.stripeCustomerId
      });
  } catch (error) {
    console.error("Error in boostProperty:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

module.exports={
    createSubscriptionPlan,
    getAllSubscriptionPlans,
    getSubscriptionPlanById,
    updateSubscriptionPlan,
    deleteSubscriptionPlan,
    purchaseSubscribePlan
}