const User = require("../models/user.model");
const Property = require("../models/property.model");
const SubscriptionPlan = require("../models/subscriptionPlan.model");

const manageSubscription = async (user, plan, subscriptionId) => {
  try {
    const now = new Date();
    const planDurationMonths = plan.duration || 1;
    
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + planDurationMonths);
    
    const activeSubscriptionIndex = user.subscription.findIndex(
      (sub) => sub.plan.toString() === plan._id.toString() && new Date(sub.endDate) > now
    );
    
    if (activeSubscriptionIndex >= 0) {
      const existingSub = user.subscription[activeSubscriptionIndex];
      const currentEndDate = new Date(existingSub.endDate);
      currentEndDate.setMonth(currentEndDate.getMonth() + planDurationMonths);
      user.subscription[activeSubscriptionIndex].endDate = currentEndDate;
      user.subscription[activeSubscriptionIndex].isExpired = false;
    } else {
      user.subscription.push({
        plan: plan._id,
        stripeSubscriptionId: subscriptionId,
        startDate: now,
        endDate,
        isExpired: false
      });
    }
    
    user.propertyLimit += plan.propertyLimit;
    
    user.subscriptionPlanIsActive = true;
    
    return user;
  } catch (error) {
    console.error("Error managing subscription:", error);
    throw new Error("Failed to manage subscription: " + error.message);
  }
};

const activateDraftProperties = async (user) => {
  try {
    const activePropertiesCount = await Property.countDocuments({
      createdBy: user._id,
      status: 'Active'
    });
    
    const remainingActivationLimit = user.propertyLimit - activePropertiesCount;
    console.log('remainingActivationLimit: ', remainingActivationLimit);
    
    if (remainingActivationLimit <= 0) {
      return 0;
    }
    
    const draftProperties = await Property.find({
      createdBy: user._id,
      status: 'Draft'
    }).limit(remainingActivationLimit);
    
    if (draftProperties.length === 0) {
      return 0;
    }
    
    const propertyIdsToActivate = draftProperties.map(prop => prop._id);
    await Property.updateMany(
      { _id: { $in: propertyIdsToActivate } },
      { $set: { status: 'Active' } }
    );
    
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
