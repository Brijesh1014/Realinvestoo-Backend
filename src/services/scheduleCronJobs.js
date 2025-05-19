const Banner = require("../models/banner.model");
const Property = require("../models/property.model");
const User = require("../models/user.model");

const startBannerExpiryJob = async() => {
    try {
      const now = new Date();

      const expiredBanners = await Banner.find({
        isPaid: true,
        expiryDate: { $lte: now },
        isExpired: false,
      });

      if (expiredBanners.length === 0) {
        console.log("[CRON] No banners to expire.");
        return;
      }

      await Promise.all(
        expiredBanners.map(async (banner) => {
          banner.isExpired = true;
          await banner.save();

          console.log(`[CRON] Expired banner: ${banner._id}`);
        })
      );

      console.log(
        `[CRON] Banner Expiry Job: ${expiredBanners.length} banner(s) marked as expired`
      );
    } catch (error) {
      console.error("[CRON] Error in Banner Expiry Job:", error.message);
    }

  console.log("[CRON] Banner expiry cron job scheduled.");
};

const startBoostExpiryJob = async() => {
    try {
      const now = new Date();

      const propertiesToUpdate = await Property.find({
        isBoost: true,
        "boostPlan.expiryDate": { $lte: now },
      });

      if (propertiesToUpdate.length === 0) {
        console.log("[CRON] No boost properties to expire.");
        return;
      }

      await Promise.all(
        propertiesToUpdate.map(async (property) => {
          property.isBoost = false;
          await property.save();
          console.log(
            `[CRON] Boost flag set to false for property: ${property._id}`
          );
        })
      );

      console.log(
        `[CRON] Boost Expiry Job: ${propertiesToUpdate.length} property(ies) processed`
      );
    } catch (error) {
      console.error("[CRON] Error in Boost Expiry Job:", error.message);
    }

  console.log("[CRON] Boost expiry cron job scheduled.");
};

const startSubscriptionExpiryJob = async() => {
    try {
      const now = new Date();
      console.log("[CRON] Checking for expired subscriptions at", now);

      const users = await User.find({ subscription: { $exists: true, $not: { $size: 0 } } });
      
      if (users.length === 0) {
        console.log("[CRON] No users with subscriptions found.");
        return;
      }

      let expiredSubscriptionsCount = 0;
      let updatedUsersCount = 0;

      await Promise.all(
        users.map(async (user) => {
          let hasChanges = false;
          let hasActiveSubscription = false;

          user.subscription.forEach(sub => {
            if (sub.endDate < now && !sub.isExpired) {
              sub.isExpired = true;
              hasChanges = true;
              expiredSubscriptionsCount++;
              console.log(`[CRON] Marked subscription expired for user: ${user._id}, plan: ${sub.plan}`);
            }

            if (sub.endDate >= now) {
              hasActiveSubscription = true;
            }
          });

          if (user.subscriptionPlanIsActive !== hasActiveSubscription) {
            user.subscriptionPlanIsActive = hasActiveSubscription;
            hasChanges = true;
            console.log(`[CRON] Updated subscriptionPlanIsActive=${hasActiveSubscription} for user: ${user._id}`);
          }
          
          if (hasChanges) {
            await user.save();
            updatedUsersCount++;
          }
        })
      );

      console.log(
        `[CRON] Subscription Expiry Job: ${expiredSubscriptionsCount} subscription(s) marked as expired, ${updatedUsersCount} user(s) updated`
      );
    } catch (error) {
      console.error("[CRON] Error in Subscription Expiry Job:", error.message);
    }

  console.log("[CRON] Subscription expiry cron job scheduled.");
};

module.exports = {
    startBoostExpiryJob,
    startBannerExpiryJob,
    startSubscriptionExpiryJob
};
