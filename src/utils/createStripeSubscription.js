// controllers/stripe.controller.js

require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/user.model");

async function createStripeSubscription({ userId, priceId, metadata = {} }) {
  console.log(`🔔 [createStripeSubscription] Starting for userId=${userId}`);

  // 1) Fetch user
  const user = await User.findById(userId);
  if (!user) throw new Error(`User not found: ${userId}`);

  // 2) Create or reuse Customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    console.log(`➕ [Stripe] Creating new customer for userId=${userId}`);
    const customer = await stripe.customers.create({ metadata: { userId, ...metadata } });
    customerId = customer.id;
    user.stripeCustomerId = customerId;
    await user.save();
    console.log(`✅ [Stripe] Customer created: ${customerId}`);
  } else {
    console.log(`🔄 [Stripe] Reusing customer: ${customerId}`);
  }

  // 3) Create subscription, expand only latest_invoice
  console.log(`➕ [Stripe] Creating subscription for customer=${customerId}`);
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      payment_method_types: ["card"],
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice"],
  });
  console.log(`✅ [Stripe] Subscription created: ${subscription.id}`);

  // 4) Extract the invoice ID (could be string or object)
  const invoiceRef = subscription.latest_invoice;
  const invoiceId = typeof invoiceRef === "string" ? invoiceRef : invoiceRef.id;
  console.log(`🔍 [Stripe] Retrieved invoice ID: ${invoiceId}`);

  // 5) Retrieve the invoice (without expanding payment_intent)
  const invoice = await stripe.invoices.retrieve(invoiceId);
  console.log(`✅ [Stripe] Invoice retrieved: ${invoice.id}`);
  
  // 6) Create a PaymentIntent for this invoice
  console.log(`➕ [Stripe] Creating payment intent for invoice=${invoice.id}`);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: invoice.amount_due,
    currency: invoice.currency,
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    description: `Payment for invoice ${invoice.id}`,
    metadata: { 
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      userId,
      subscriptionPlanId: metadata.subscriptionPlanId,
      ...metadata 
    }
  });
  console.log(`💳 [Stripe] PaymentIntent client_secret: ${paymentIntent.client_secret}`);
  
  // 7) Update the invoice with reference to our payment intent
  await stripe.invoices.update(invoice.id, {
    metadata: {
      paymentIntentId: paymentIntent.id
    }
  });
  console.log(`🔄 [Stripe] Updated invoice with payment intent reference`);

  // 8) Save subscription ID to user
  user.stripeSubscriptionId = subscription.id;
  await user.save();
  console.log(`💾 [DB] Saved stripeSubscriptionId to User ${userId}`);

  // 9) Return everything the front end & your DB need
  return {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    invoiceId,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

module.exports = createStripeSubscription

