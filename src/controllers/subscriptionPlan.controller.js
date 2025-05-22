const SubscriptionPlan = require("../models/subscriptionPlan.model");
const PaymentHistory = require("../models/paymentHistory.model");
const createStripeSubscription = require("../utils/createStripeSubscription");
const User = require("../models/user.model");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const createSubscriptionPlan = async (req, res) => {
  try {
    const { name, price, offerPrice,duration, description } = req.body;

    const stripeProduct = await stripe.products.create({
      name,
      description: description || "",
    });

    const stripePrice = await stripe.prices.create({
      unit_amount: Math.round(offerPrice * 100),
      currency: "inr",
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
    res
      .status(200)
      .json({
        success: true,
        message: "Fetched all subscription plans",
        plans,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch subscription plans",
        error: error.message,
      });
  }
};

const getSubscriptionPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Subscription plan not found" });

    res
      .status(200)
      .json({ success: true, message: "Fetched subscription plan", plan });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch subscription plan",
        error: error.message,
      });
  }
};

const updateSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Subscription plan not found" });

    res
      .status(200)
      .json({
        success: true,
        message: "Subscription plan updated successfully",
        plan,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update subscription plan",
        error: error.message,
      });
  }
};

const deleteSubscriptionPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    if (!plan)
      return res
        .status(404)
        .json({ success: false, message: "Subscription plan not found" });

    res
      .status(200)
      .json({
        success: true,
        message: "Subscription plan deleted successfully",
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: true,
        message: "Failed to delete subscription plan",
        error: error.message,
      });
  }
};

// … other requires …

const purchaseSubscribePlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.userId;
    if (!planId) throw new Error("Plan ID is required");

    // Load user & plan
    const [user, plan] = await Promise.all([
      User.findById(userId),
      SubscriptionPlan.findById(planId),
    ]);
    if (!user) throw new Error("User not found");
    if (!plan || !plan.stripePriceId) throw new Error("Plan not found or missing Stripe price");

    // Build metadata
    const metadata = {
      subscriptionPlanId: planId,
      userId,
      planName: plan.name,
      propertyLimit: plan.propertyLimit,
      planDuration: plan.duration || 1,
    };

    // Create subscription
    const {
      stripeCustomerId,
      stripeSubscriptionId,
      invoiceId,
      clientSecret,
      paymentIntentId
    } = await createStripeSubscription({
      userId,
      priceId: plan.stripePriceId,
      metadata,
    });
    
    // Record it in your DB
    await PaymentHistory.create({
      userId,
      related_type: "subscription",
      subscriptionProperty: planId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_invoice_id: invoiceId,
      amount: plan.offerPrice,
      currency: "inr",
      status: "pending",
      metadata: JSON.stringify(metadata),
      stripe_payment_intent_id:paymentIntentId
    });

    // Send client_secret to the front end
    res.status(200).json({
      success: true,
      message: "Subscription created. Use clientSecret to confirm first payment.",
      data: { clientSecret, subscriptionId: stripeSubscriptionId, customerId: stripeCustomerId ,invoiceId:invoiceId},
    });
  } catch (err) {
    console.error("purchaseSubscribePlan error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};


module.exports = {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  purchaseSubscribePlan,
};
