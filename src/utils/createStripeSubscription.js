require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/user.model");

const createStripeSubscription = async ({ userId, priceId, metadata }) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata,
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  });

  return {
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
  };
};

module.exports = createStripeSubscription;
