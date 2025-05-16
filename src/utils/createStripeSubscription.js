require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/user.model");

const createStripeSubscription = async ({ userId, priceId, metadata }) => {
  try {
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
      collection_method: "charge_automatically",
      payment_settings: {
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice"],
    });

    const invoice = subscription.latest_invoice;
    if (!invoice) throw new Error("No invoice found for subscription");

    let clientSecret = null;
    let isSetupIntent = false;

    try {
      const retrievedInvoice = await stripe.invoices.retrieve(invoice.id, {
        expand: ["payment_intent"],
      });

      if (retrievedInvoice.payment_intent) {
        clientSecret = retrievedInvoice.payment_intent.client_secret;
      } else {
        const setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ["card"],
          usage: "off_session",
        });

        clientSecret = setupIntent.client_secret;
        isSetupIntent = true;
      }
    } catch (expandError) {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });

      clientSecret = setupIntent.client_secret;
      isSetupIntent = true;
    }

    return {
      clientSecret,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      isSetupIntent,
    };
  } catch (error) {
    throw new Error("Stripe Subscription Error: " + error.message);
  }
};

module.exports = createStripeSubscription;
