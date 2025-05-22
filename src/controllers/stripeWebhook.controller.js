require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const PaymentHistory = require("../models/paymentHistory.model");
const Banner = require("../models/banner.model");
const Property = require("../models/property.model");
const BoostPlan = require("../models/boostPlan.model");
const SubscriptionPlan = require("../models/subscriptionPlan.model");
const User = require("../models/user.model");
const SubscriptionService = require("../services/subscription.service");
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripeWebhook = async (req, res) => {

  
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    console.error("No Stripe signature found in headers");
    return res.status(400).send("No Stripe signature found");
  }
  
  let event;

  try {

    if (!Buffer.isBuffer(req.body)) {
      console.error("Request body is not a Buffer as expected");
      return res.status(400).send("Webhook Error: Request body is not in the expected format");
    }
    
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log("✅ Webhook signature verified successfully");
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const intent = event.data.object;

  console.log(`Received event type: ${event.type}`);

  if (event.type === "payment_intent.succeeded") {
    console.log("Payment Intent Succeeded:", intent.id);
    
    // Regular non-subscription payment intent handling
    const history = await PaymentHistory.findOneAndUpdate(
      { stripe_payment_intent_id: intent.id },
      { status: "succeeded" },
      { new: true }
    );
    
    if (!history) {
      console.log("No payment history found for payment intent:", intent.id);
      return res.status(200).send({ received: true });
    }

    console.log(`Processing succeeded payment for ${history.related_type}`);

    if (history.related_type === "banner" && history.banner) {
      const banner = await Banner.findById(history.banner).populate("planId");
      if (banner && banner.planId) {
        banner.isPaid = true;
        banner.expiryDate = new Date(Date.now() + banner.planId.duration * 24 * 60 * 60 * 1000);
        await banner.save();
        console.log(`Banner ${banner._id} marked as paid with expiry ${banner.expiryDate}`);
      }
    }

    if (history.related_type === "boost" && history.boostProperty) {
      console.log("Processing boost payment");
      
      const property = await Property.findById(history.boostProperty);

      const boostPlanId = history.boostPlanId || history.metadata?.boostPlanId;

      const boostPlan = boostPlanId ? await BoostPlan.findById(boostPlanId) : null;
      
      if (property && boostPlan) {
        const expiryDate = new Date(Date.now() + boostPlan.duration * 24 * 60 * 60 * 1000);
        property.boostPlan.push({ plan: boostPlan._id, expiryDate });
        property.isBoost = true;
        await property.save();
        console.log(`Property ${property._id} boosted until ${expiryDate}`);
      } else {
        console.error('Failed to process boost:', { 
          propertyFound: !!property, 
          boostPlanId: boostPlanId, 
          boostPlanFound: !!boostPlan 
        });
      }
    }

   if (history.related_type === "subscription" && history.subscriptionProperty) {
      const paymentIntent = event.data.object;
      
      try {
        // Get subscription ID from the payment history record
        const subscriptionId = history.stripe_subscription_id;
        
        if (!subscriptionId) {
          console.error("No subscription ID found in payment history record");
          try {
            if (history.stripe_customer_id) {
              const subscriptions = await stripe.subscriptions.list({
                customer: history.stripe_customer_id,
                limit: 1
              });
              
              if (subscriptions && subscriptions.data.length > 0) {
                const latestSubscription = subscriptions.data[0];
                // Update payment history with subscription ID
                history.stripe_subscription_id = latestSubscription.id;
                await history.save();
                console.log(`Found subscription ID: ${latestSubscription.id} for customer: ${history.stripe_customer_id}`);
              }
            }
          } catch (stripeError) {
            console.error("Error retrieving subscription from Stripe:", stripeError);
          }
          
          // If still no subscription ID, abort
          if (!history.stripe_subscription_id) {
            console.error("Could not find subscription ID anywhere");
            return;
          }
        }
        
        const subscriptionIdToUse = history.stripe_subscription_id;
        
        const user = await User.findById(history.userId);
        const plan = await SubscriptionPlan.findById(history.subscriptionProperty);
        
        if (!user || !plan) {
          console.error('User or subscription plan not found', { 
            userId: history.userId, 
            planId: history.subscriptionProperty 
          });
          return;
        }
        
        console.log(`Processing subscription payment for user ${user._id} with plan ${plan._id} and subscription ID: ${subscriptionIdToUse}`);
        
        await SubscriptionService.manageSubscription(user, plan, subscriptionIdToUse);
        const activatedCount = await SubscriptionService.activateDraftProperties(user);
        await user.save();
        
        console.log(`Subscription updated for user ${user._id}. Property limit: ${user.propertyLimit}. Activated ${activatedCount} draft properties.`);
      } catch (error) {
        console.error(`Error in subscription payment processing: ${error.message}`);
      }
    }
  }


  res.status(200).send({ received: true });
};

module.exports = stripeWebhook;
