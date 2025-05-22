const User = require("../models/user.model");
const Property = require("../models/property.model");
const SubscriptionPlan = require("../models/subscriptionPlan.model");

const manageSubscription = async (user, plan, subscriptionId) => {
  try {
    const now = new Date();

    const endDate = new Date(now);
    const duration = plan.duration || 1;

    switch (plan.billingInterval) {
      case "day":
        endDate.setDate(endDate.getDate() + duration);
        break;
      case "month":
        endDate.setMonth(endDate.getMonth() + duration);
        break;
      case "year":
        endDate.setFullYear(endDate.getFullYear() + duration);
        break;
      default:
        throw new Error(
          `Unsupported billing interval: ${plan.billingInterval}`
        );
    }

    const activeSubscriptionIndex = user.subscription.findIndex(
      (sub) =>
        sub.plan.toString() === plan._id.toString() &&
        new Date(sub.endDate) > now
    );

    const previousPropertyLimit = user.propertyLimit || 0;

    if (activeSubscriptionIndex >= 0) {
      const existingSub = user.subscription[activeSubscriptionIndex];
      const currentEndDate = new Date(existingSub.endDate);

      switch (plan.billingInterval) {
        case "day":
          currentEndDate.setDate(currentEndDate.getDate() + duration);
          break;
        case "month":
          currentEndDate.setMonth(currentEndDate.getMonth() + duration);
          break;
        case "year":
          currentEndDate.setFullYear(currentEndDate.getFullYear() + duration);
          break;
        default:
          throw new Error(
            `Unsupported billing interval: ${plan.billingInterval}`
          );
      }

      user.subscription[activeSubscriptionIndex].endDate = currentEndDate;
      user.subscription[activeSubscriptionIndex].isExpired = false;
    } else {
      user.subscription.push({
        plan: plan._id,
        stripeSubscriptionId: subscriptionId,
        startDate: now,
        endDate,
        isExpired: false,
      });
    }

    const existingLimit = previousPropertyLimit || 0;
    const planLimit = plan.propertyLimit || 0;
    user.propertyLimit = existingLimit + planLimit;

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
      status: "Active",
    });

    const totalPropertiesCount = await Property.countDocuments({
      createdBy: user._id,
    });
    const draftPropertiesCount = await Property.countDocuments({
      createdBy: user._id,
      status: "Draft",
    });

    if (user.createdPropertiesCount !== totalPropertiesCount) {
      user.createdPropertiesCount = totalPropertiesCount;
    }

    const availableSlotsForActivation = user.propertyLimit;

    if (availableSlotsForActivation <= 0) {
      await user.save();
      return 0;
    }

    // Find draft properties to activate, ordered by newest first
    const draftProperties = await Property.find({
      createdBy: user._id,
      status: "Draft",
    })
      .sort({ createdAt: -1 })
      .limit(availableSlotsForActivation);

    if (draftProperties.length === 0) {
      console.log(`No draft properties found for user ${user._id}`);
      await user.save();
      return 0;
    }

    const propertyIdsToActivate = draftProperties.map((prop) => prop._id);
    console.log("propertyIdsToActivate: ", propertyIdsToActivate);

    await Property.updateMany(
      { _id: { $in: propertyIdsToActivate } },
      { $set: { status: "Active" } }
    );

    const previousLimit = user.propertyLimit;
    user.propertyLimit = Math.max(
      0,
      user.propertyLimit - draftProperties.length
    );

    const now = new Date();
    let activeSubscriptionIndex = -1;
    let mostRecentEndDate = null;

    for (let i = 0; i < user.subscription.length; i++) {
      const sub = user.subscription[i];
      if (sub.endDate && new Date(sub.endDate) > now) {
        if (!mostRecentEndDate || new Date(sub.endDate) > mostRecentEndDate) {
          mostRecentEndDate = new Date(sub.endDate);
          activeSubscriptionIndex = i;
        }
      }
    }

    if (activeSubscriptionIndex >= 0) {
      if (
        user.subscription[activeSubscriptionIndex].propertiesCreated !==
        undefined
      ) {
        user.subscription[activeSubscriptionIndex].propertiesCreated +=
          draftProperties.length;
      } else {
        user.subscription[activeSubscriptionIndex].propertiesCreated =
          draftProperties.length;
      }
    }

    await user.save();

    return draftProperties.length;
  } catch (error) {
    console.error("Error activating draft properties:", error);
    throw error;
  }
};

module.exports = {
  manageSubscription,
  activateDraftProperties,
};
