const User = require("../models/user.model");
const Property = require("../models/property.model");
const SubscriptionPlan = require("../models/subscriptionPlan.model");

const manageSubscription = async (user, plan, subscriptionId) => {
  try {
    const now = new Date();
    const planDurationMonths = plan.duration || 1;
    
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + planDurationMonths);
    
    // Check if the user already has an active subscription for this plan
    const activeSubscriptionIndex = user.subscription.findIndex(
      (sub) => sub.plan.toString() === plan._id.toString() && new Date(sub.endDate) > now
    );
    
    // Log the current property limit before any changes
    const previousPropertyLimit = user.propertyLimit || 0;
    console.log(`User ${user._id} previous property limit: ${previousPropertyLimit}`);
    
    // Handle subscription entry
    if (activeSubscriptionIndex >= 0) {
      // Extend existing subscription
      const existingSub = user.subscription[activeSubscriptionIndex];
      const currentEndDate = new Date(existingSub.endDate);
      currentEndDate.setMonth(currentEndDate.getMonth() + planDurationMonths);
      user.subscription[activeSubscriptionIndex].endDate = currentEndDate;
      user.subscription[activeSubscriptionIndex].isExpired = false;
      
      console.log(`Extended subscription end date to ${currentEndDate}`);
    } else {
      // Create new subscription entry
      user.subscription.push({
        plan: plan._id,
        stripeSubscriptionId: subscriptionId,
        startDate: now,
        endDate,
        isExpired: false,
      });
      
      console.log(`Added new subscription with end date ${endDate}`);
    }
    

    // Add the subscription plan's property limit to the user's property limit
    // Ensure we're starting with the correct previous limit
    const existingLimit = previousPropertyLimit || 0;
    const planLimit = plan.propertyLimit || 0;
    
    // Simply add the plan's limit to the existing limit
    user.propertyLimit = existingLimit + planLimit;
    
    console.log(`Property limit calculation: ${existingLimit} + ${planLimit} = ${user.propertyLimit}`);
    
    user.subscriptionPlanIsActive = true;
    
    console.log(`User ${user._id} new property limit: ${user.propertyLimit}`);
    return user;
  } catch (error) {
    console.error("Error managing subscription:", error);
    throw new Error("Failed to manage subscription: " + error.message);
  }
};

const activateDraftProperties = async (user) => {
  try {
    console.log('STARTING activateDraftProperties with property limit:', user.propertyLimit);
    // Get current counts of active properties
    const activePropertiesCount = await Property.countDocuments({
      createdBy: user._id,
      status: 'Active'
    });
    console.log('activePropertiesCount: ', activePropertiesCount);
    
    // Calculate how many more properties can be activated
    const remainingActivationLimit = user.propertyLimit - activePropertiesCount;
    console.log('remainingActivationLimit: ', remainingActivationLimit);
    console.log(`User ${user._id} property limits: ${activePropertiesCount}/${user.propertyLimit}, can activate ${remainingActivationLimit} more`);
    
    // If no room for more active properties, return early
    if (remainingActivationLimit <= 0) {
      console.log(`Cannot activate any more properties for user ${user._id} - limit reached`);
      return 0;
    }
    
    // Find draft properties to activate, ordered by newest first
    const draftProperties = await Property.find({
      createdBy: user._id,
      status: 'Draft'
    })
    .sort({ createdAt: -1 }) // Activate newest properties first
    .limit(remainingActivationLimit);
    
    if (draftProperties.length === 0) {
      console.log(`No draft properties found for user ${user._id}`);
      return 0;
    }
    
    // Activate the properties
    const propertyIdsToActivate = draftProperties.map(prop => prop._id);
    await Property.updateMany(
      { _id: { $in: propertyIdsToActivate } },
      { $set: { status: 'Active' } }
    );
    
    // Find the most recent active subscription to associate these properties with
    const now = new Date();
    let activeSubscriptionIndex = -1;
    let mostRecentEndDate = null;
    
    for (let i = 0; i < user.subscription.length; i++) {
      const sub = user.subscription[i];
      if (sub.endDate && new Date(sub.endDate) > now) {
        // This is an active subscription
        if (!mostRecentEndDate || new Date(sub.endDate) > mostRecentEndDate) {
          mostRecentEndDate = new Date(sub.endDate);
          activeSubscriptionIndex = i;
        }
      }
    }
    
    // If we found an active subscription, record that these properties were activated by it
    if (activeSubscriptionIndex >= 0) {
      // Increment propertiesCreated count for this subscription if it exists
      if (user.subscription[activeSubscriptionIndex].propertiesCreated !== undefined) {
        user.subscription[activeSubscriptionIndex].propertiesCreated += draftProperties.length;
      } else {
        user.subscription[activeSubscriptionIndex].propertiesCreated = draftProperties.length;
      }
      
      console.log(`Associated ${draftProperties.length} properties with subscription ending ${mostRecentEndDate}`);
    }
    
    console.log(`Activated ${draftProperties.length} Draft properties for user ${user._id} based on plan limit`);
    return draftProperties.length;
  } catch (error) {
    console.error("Error activating draft properties:", error);
    throw error;
  }
};

module.exports = {
  manageSubscription,
  activateDraftProperties
};
