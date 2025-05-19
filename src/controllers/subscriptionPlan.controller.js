const SubscriptionPlan = require("../models/subscriptionPlan.model");
const PaymentHistory = require("../models/paymentHistory.model");
const  createStripeSubscription  = require("../utils/createStripeSubscription");
const User = require("../models/user.model");
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
    
    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }
    
    if (!plan.stripePriceId) {
      return res.status(400).json({
        success: false,
        message: "Stripe price ID not configured for this plan",
      });
    }
    
    // Check if plan is active
    // if (plan.status !== "active") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "This subscription plan is not available for purchase",
    //   });
    // }

    const metadata = {
      subscriptionPlanId: planId,
      userId: userId,
      planName: plan.name,
      propertyLimit: plan.propertyLimit,
      planDuration: plan.duration || 1, 
    };

  
    const result = await createStripeSubscription({
      userId,
      priceId: plan.stripePriceId,
      metadata,
    });

    if (!result || !result.clientSecret) {
      return res.status(500).json({
        success: false,
        message: "Failed to create subscription",
      });
    }

    const paymentRecord = await PaymentHistory.create({
      userId,
      related_type: "subscription",
      subscriptionProperty: planId,
      stripe_customer_id: result.stripeCustomerId,
      stripe_subscription_id: result.stripeSubscriptionId,
      stripe_invoice_id: result.invoiceId,
      amount: plan.price,
      currency: "usd",
      status: "pending",
      metadata: JSON.stringify(metadata),
    });

    console.log(`Created payment record: ${paymentRecord._id} for plan: ${plan.name}`);

    // Respond with subscription details
    res.status(200).json({
      success: true,
      message: "Subscription created. Confirm payment on the client side.",
      data: {
        clientSecret: result.clientSecret,
        subscriptionId: result.stripeSubscriptionId,
        customerId: result.stripeCustomerId,
        isSetupIntent:result.isSetupIntent,
        planDetails: {
          name: plan.name,
          price: plan.price,
          duration: plan.duration || 1,
          propertyLimit: plan.propertyLimit,
        }
      }
    });
  } catch (error) {
    console.error("Error in purchaseSubscribePlan:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing subscription purchase",
      error: error.message,
    });
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