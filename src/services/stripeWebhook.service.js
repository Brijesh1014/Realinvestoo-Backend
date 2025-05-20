const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const PaymentHistory = require("../models/paymentHistory.model");
const SubscriptionPlan = require("../models/subscriptionPlan.model");
const User = require("../models/user.model");
const SubscriptionService = require("./subscription.service");

/**
 * Handles successful payment_intent for subscriptions
 * Links the payment to the subscription and activates it
 */
async function handleSubscriptionPaymentIntent(intent) {
  try {
    // Only process subscription-related payments
    if (!(intent.metadata && intent.metadata.subscriptionId && intent.metadata.invoiceId)) {
      return { success: false, message: "Not a subscription payment" };
    }

    console.log(`Processing subscription payment for subscription ${intent.metadata.subscriptionId}`);
    
    // 1. Retrieve the subscription and invoice
    const subscription = await stripe.subscriptions.retrieve(intent.metadata.subscriptionId);
    const invoice = await stripe.invoices.retrieve(intent.metadata.invoiceId);
    
    console.log(`Subscription status: ${subscription.status}, Invoice status: ${invoice.status}`);
    
    // 2. Link the payment to the invoice if not already paid
    if (invoice.status !== 'paid') {
      await stripe.invoices.pay(invoice.id, {
        paid_out_of_band: true
      });
      console.log(`Marked invoice ${invoice.id} as paid`);
    }
    
    // 3. Activate the subscription if needed
    if (subscription.status === 'incomplete') {
      await stripe.subscriptions.update(subscription.id, { status: 'active' });
      console.log(`Activated subscription ${subscription.id}`);
    }
    
    // 4. Update the user's property limits and activate draft properties
    const userId = intent.metadata.userId;
    const user = await User.findById(userId);
    const subscriptionPlanId = subscription.metadata.subscriptionPlanId || intent.metadata.subscriptionPlanId;
    const plan = await SubscriptionPlan.findById(subscriptionPlanId);
    
    if (user && plan) {
      console.log(`Processing subscription for user ${userId} with plan ${subscriptionPlanId}`);
      
      await SubscriptionService.manageSubscription(user, plan, subscription.id);
      await SubscriptionService.activateDraftProperties(user);
      await user.save();
      
      console.log(`Updated user property limits: ${user.propertyLimit}`);
    }
    
    // 5. Create payment history record
    const history = await PaymentHistory.findOne({ stripe_payment_intent_id: intent.id });
    
    if (!history) {
      await PaymentHistory.create({
        userId,
        related_type: "subscription",
        subscriptionProperty: subscriptionPlanId,
        stripe_payment_intent_id: intent.id,
        stripe_subscription_id: subscription.id,
        stripe_invoice_id: invoice.id,
        stripe_customer_id: intent.customer,
        amount: intent.amount / 100,
        currency: intent.currency,
        status: "succeeded",
        metadata: intent.metadata
      });
      console.log(`Created payment history record for payment ${intent.id}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error processing subscription payment: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Handles payment_intent.succeeded for mobile subscription
 */
async function handleMobileSubscriptionPayment(intent) {
  try {
    if (!(intent.metadata && intent.metadata.isSubscription === "true")) {
      return { success: false, message: "Not a mobile subscription payment" };
    }
    
    console.log("Processing mobile subscription payment intent:", intent.id);
    
    // Create a payment history record if none exists
    let history = await PaymentHistory.findOne({ stripe_payment_intent_id: intent.id });
    
    if (!history) {
      const subscriptionPlanId = intent.metadata.subscriptionPlanId;
      const userId = intent.metadata.userId;
      
      console.log(`Creating payment history for mobile subscription: Plan=${subscriptionPlanId}, User=${userId}`);
      
      history = await PaymentHistory.create({
        userId,
        related_type: "subscription",
        subscriptionProperty: subscriptionPlanId,
        stripe_payment_intent_id: intent.id,
        stripe_customer_id: intent.customer,
        amount: intent.amount / 100, // Convert from cents
        currency: intent.currency,
        status: "succeeded",
        metadata: intent.metadata
      });
      
      try {
        // Create the subscription now that payment is complete
        const priceId = intent.metadata.priceId;
        const subscription = await stripe.subscriptions.create({
          customer: intent.customer,
          items: [{ price: priceId }],
          metadata: intent.metadata,
        });
        
        console.log(`Created subscription ${subscription.id} for mobile payment ${intent.id}`);
        
        // Update payment history with subscription ID
        history.stripe_subscription_id = subscription.id;
        await history.save();
        
        // Process the subscription for the user
        const user = await User.findById(userId);
        const plan = await SubscriptionPlan.findById(subscriptionPlanId);
        
        if (user && plan) {
          console.log('Before update - User subscription data:', {
            subscriptions: user.subscription?.length || 0,
            propertyLimit: user.propertyLimit || 0
          });
          
          await SubscriptionService.manageSubscription(user, plan, subscription.id);
          await SubscriptionService.activateDraftProperties(user);
          await user.save();
          
          console.log('After update - User subscription data:', {
            subscriptions: user.subscription?.length || 0,
            propertyLimit: user.propertyLimit || 0
          });
          
          console.log(`Updated subscription for user ${user._id} with plan ${plan._id}`);
        }
      } catch (error) {
        console.error(`Error processing mobile subscription: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error in handleMobileSubscriptionPayment: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Handles invoice.payment_succeeded webhook events
 */
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    console.log("Processing invoice.payment_succeeded");
    
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    if (!subscriptionId) {
      return { success: false, message: "No subscription ID on invoice" };
    }

    let userId = null;
    let subscriptionPlanId = null;

    try {
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
    } catch (err) {
      console.error("Error retrieving subscription metadata:", err.message);
      return { success: false, error: err.message };
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
      console.log('Created new payment history for subscription invoice:', history._id);
    }

    if (history || (userId && subscriptionPlanId)) {
      const user = history ? await User.findById(history.userId) : await User.findById(userId);
      const plan = history ? await SubscriptionPlan.findById(history.subscriptionProperty) : await SubscriptionPlan.findById(subscriptionPlanId);

      if (!user || !plan) {
        console.error('User or plan not found:', { userId: user?._id, planId: plan?._id });
        return { success: false, message: "User or plan not found" };
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
      
      return { success: true };
    } else {
      console.error('Could not process subscription invoice: No valid payment history or metadata found');
      return { success: false, message: "No valid payment history or metadata found" };
    }
  } catch (error) {
    console.error(`Error processing invoice payment: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  handleSubscriptionPaymentIntent,
  handleMobileSubscriptionPayment,
  handleInvoicePaymentSucceeded
};
