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

    // Handle boost payments
    if (history.related_type === "boost" && history.boostProperty) {
      const property = await Property.findById(history.boostProperty);
      const boostPlan = await BoostPlan.findById(history.metadata?.boostPlanId || history.boostPlanId);
      if (property && boostPlan) {
        const expiryDate = new Date(Date.now() + boostPlan.duration * 24 * 60 * 60 * 1000);
        property.boostPlan.push({ plan: boostPlan._id, expiryDate });
        property.isBoost = true;
        await property.save();
        console.log(`Property ${property._id} boosted until ${expiryDate}`);
      }
    }

    if (history.related_type === "subscription" && history.subscriptionProperty) {
      try {
        let subscriptionId = null;
        
        if (intent.metadata && intent.metadata.subscription_id) {
          subscriptionId = intent.metadata.subscription_id;
        }
        
        if (!subscriptionId && intent.invoice) {
          try {
            const invoice = await stripe.invoices.retrieve(intent.invoice);
            if (invoice && invoice.subscription) {
              subscriptionId = invoice.subscription;
              history.stripe_subscription_id = subscriptionId;
              await history.save();
            }
          } catch (err) {
            console.error("Error retrieving invoice for subscription:", err.message);
          }
        }

        if (subscriptionId) {
          const user = await User.findById(history.userId);
          const plan = await SubscriptionPlan.findById(history.subscriptionProperty);
          
          if (user && plan) {
            await SubscriptionService.manageSubscription(user, plan, subscriptionId);
            
            await SubscriptionService.activateDraftProperties(user);
            
            await user.save();
            console.log(`Updated subscription for user ${user._id} with plan ${plan._id}`);
          }
        } else {
          console.log("Subscription ID not found for payment intent:", intent.id);
        }
      } catch (error) {
        console.error(`Error processing subscription payment: ${error.message}`);
      }
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    try {
      console.log("Processing invoice.payment_succeeded");
      
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      const customerId = invoice.customer;


      let userId = null;
      let subscriptionPlanId = null;

      try {
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price.product']
          });
          
          userId = subscription.metadata?.userId;
          subscriptionPlanId = subscription.metadata?.subscriptionPlanId;
          
          console.log('Subscription data:', { 
            id: subscriptionId,
            customerId,
            userId,
            subscriptionPlanId,
            metadata: subscription.metadata
          });
        }
      } catch (err) {
        console.error("Error retrieving subscription metadata:", err.message);
      }

      let history = await PaymentHistory.findOne({ stripe_subscription_id: subscriptionId });
      
      if (history) {
        history.status = "succeeded";
        history.stripe_invoice_id = invoice.id;
        history.stripe_customer_id = customerId;
        await history.save();
        console.log('Updated existing payment history:', history._id);
      } else if (userId && subscriptionPlanId) {
        history = await PaymentHistory.create({
          userId: userId,
          subscriptionProperty: subscriptionPlanId,
          stripe_subscription_id: subscriptionId,
          stripe_invoice_id: invoice.id,
          stripe_customer_id: customerId,
          status: "succeeded",
          related_type: "subscription",
          currency: "usd",
          amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
        });
        console.log('Created new payment history for first-time subscription invoice:', history._id);
      }

      if (history || (userId && subscriptionPlanId)) {
        const user = history ? await User.findById(history.userId) : await User.findById(userId);
        const plan = history ? await SubscriptionPlan.findById(history.subscriptionProperty) : await SubscriptionPlan.findById(subscriptionPlanId);

        if (!user || !plan) {
          console.error('User or plan not found:', { userId: user?._id, planId: plan?._id });
          return res.status(200).send({ received: true });
        }

        console.log('Before update - User subscription data:', {
          subscriptions: user.subscription?.length || 0,
          propertyLimit: user.propertyLimit || 0
        });

        await SubscriptionService.manageSubscription(user, plan, subscriptionId);
        
        await SubscriptionService.activateDraftProperties(user);
        
        await user.save();
        
        console.log('After update - User subscription data:', {
          subscriptions: user.subscription?.length || 0,
          propertyLimit: user.propertyLimit || 0
        });
        
        console.log(`Updated subscription for user ${user._id} with plan ${plan._id}`);
      } else {
        console.error('Could not process subscription invoice: No valid payment history or metadata found');
      }
    } catch (error) {
      console.error(`Error processing invoice payment: ${error.message}`, error);
    }
  }

  res.status(200).send({ received: true });
};

module.exports = stripeWebhook;
