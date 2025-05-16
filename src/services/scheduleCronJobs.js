const Banner = require("../models/banner.model");
const Property = require("../models/property.model");

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

const startBoostExpiryJob =async() => {
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

module.exports = {
    startBoostExpiryJob,
    startBannerExpiryJob
};
