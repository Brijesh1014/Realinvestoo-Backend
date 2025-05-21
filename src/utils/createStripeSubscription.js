require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY,{
  apiVersion: '2023-10-16',
});
const User = require("../models/user.model");

async function createStripeSubscription({ userId, priceId, metadata = {} }) {
  try {
    console.log(`🔔 [createStripeSubscription] Starting for userId=${userId}`);

    const user = await User.findById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    const price = await stripe.prices.retrieve(priceId);
    console.log("price: ", price);
    if (!price || price.unit_amount === 0) {
      throw new Error(
        "Invalid or zero-amount price. Stripe won't create a payment_intent."
      );
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {  
      const customer = await stripe.customers.create({
        metadata: { userId, ...metadata },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
      console.log(`✅ Created new Stripe customer: ${customerId}`);
    } else {
      console.log(`🔄 Reusing existing customer: ${customerId}`);
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      collection_method: "charge_automatically",
      trial_period_days: 0,
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      metadata: { userId, ...metadata },
});

    const latestInvoiceId = subscription.latest_invoice;


    if (!latestInvoiceId) {
      throw new Error("No invoice created for subscription.");
    }
    const payment_intent = await stripe.invoices.retrieve(latestInvoiceId, {
      expand: ['payment_intent'],
    });
    const paymentIntent = payment_intent;
    if (!paymentIntent) {
      throw new Error("PaymentIntent still not found after invoice fetch.");
    }

    user.stripeSubscriptionId = subscription.id;
    await user.save();

    console.log(`✅ Subscription created: ${subscription.id}`);
    console.log(
      `💳 PaymentIntent client_secret: ${paymentIntent?.payment_intent?.client_secret}`
    );

    return {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      invoiceId: latestInvoiceId.id,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent?.payment_intent?.client_secret,
    };
  } catch (error) {
    console.error("❌ Error in createStripeSubscription:", error.message);
    throw error;
  }
}

module.exports = createStripeSubscription;
