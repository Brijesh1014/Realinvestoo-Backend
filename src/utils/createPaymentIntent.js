require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/user.model");

const createPaymentIntent = async ({ userId, amount, relatedType, metadata }) => {
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

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    customer: customerId,
    metadata: {
      userId,
      relatedType, 
      ...metadata,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    stripePaymentIntentId: paymentIntent.id,
    stripeCustomerId: customerId,
  };
};

module.exports = createPaymentIntent;
