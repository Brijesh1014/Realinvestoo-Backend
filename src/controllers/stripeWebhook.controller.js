require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const PaymentHistory = require("../models/paymentHistory.model");
const Banner = require("../models/banner.model");
const Property = require("../models/property.model");
const BoostPlan = require("../models/boostPlan.model");
const SubscriptionPlan = require("../models/subscriptionPlan.model");
const User = require("../models/user.model");
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
      return res.status(404).json({ success: false, message: "Payment history not found." });
    }

    if (history.related_type === "banner" && history.banner) {
      const banner = await Banner.findById(history.banner).populate("planId");
      if (banner && banner.planId) {
        banner.isPaid = true;
        banner.expiryDate = new Date(Date.now() + banner.planId.duration * 24 * 60 * 60 * 1000);
        await banner.save();
      }
    }

    if (history.related_type === "boost" && history.BoostProperty) {
      const property = await Property.findById(history.BoostProperty);
      const boostPlan = await BoostPlan.findById(history.metadata?.boostPlanId || history.boostPlanId);
      if (property && boostPlan) {
        const expiryDate = new Date(Date.now() + boostPlan.duration * 24 * 60 * 60 * 1000);
        property.boostPlan.push({ plan: boostPlan._id, expiryDate });
        property.isBoost = true
        await property.save();
      }
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;

    const history = await PaymentHistory.findOneAndUpdate(
      { stripe_subscription_id: subscriptionId },
      { status: "succeeded", stripe_invoice_id: invoice.id }
    );

    if (history) {
      const user = await User.findById(history.user_id);
      const plan = await SubscriptionPlan.findById(history.SubscriptionProperty);
      if (user && plan) {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(now.getMonth() + 1);
        user.subscription.push({
          plan: plan._id,
          stripeSubscriptionId: subscriptionId,
          startDate: now,
          endDate,
          propertiesCreated: 0,
        });
        await user.save();
      }
    }
  }

  res.status(200).send({ received: true });
};

module.exports = stripeWebhook;
