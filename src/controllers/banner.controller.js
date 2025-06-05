
const Banner = require("../models/banner.model");
const BannerPlan = require("../models/bannerPlan.model");
const PaymentHistory = require("../models/paymentHistory.model");
const createPaymentIntent = require("../utils/createPaymentIntent");
const User = require("../models/user.model")

const createBanner = async (req, res) => {
  try {
    const { title, description, link, image, planId } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isAdmin) {
      const banner = await Banner.create({
        title,
        description,
        link,
        image,
        createdBy: userId,
        isPaid: true,
      });

      return res.status(201).json({
        success: true,
        message: "Banner created successfully as Admin. No payment required.",
        data: { banner },
      });
    }

    if (!planId) {
      return res.status(400).json({ success: false, message: "Plan ID is required for paid banners." });
    }

    const bannerPlan = await BannerPlan.findById(planId);
    if (!bannerPlan) {
      return res.status(400).json({ success: false, message: "Banner plan not found" });
    }

    const banner = await Banner.create({
      title,
      description,
      link,
      image,
      createdBy: userId,
      planId,
    });

    const price = bannerPlan.offerPrice;

    const { clientSecret, stripeCustomerId, stripePaymentIntentId } = await createPaymentIntent({
      userId,
      amount: price,
      relatedType: "banner",
      metadata: {
        bannerId: banner._id.toString(),
        planId: planId.toString(),
      },
    });

    await PaymentHistory.create({
      userId: userId,
      related_type: "banner",
      banner: banner._id,
      amount: price,
      stripe_customer_id: stripeCustomerId,
      stripe_payment_intent_id: stripePaymentIntentId,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Banner created. Proceed to payment.",
      data: {
        banner,
        clientSecret,
      },
    });
  } catch (err) {
    console.error("Create banner error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};




const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.find({
      isPaid: true,
      isExpired: false,
    })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");
    res.status(200).json({
      success: true,
      message: "Get all banners successfully",
      data: banners,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );
    if (!banner)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });

    res.status(200).json({
      success: true,
      message: "Get Banner successfully",
      data: banner,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBanner = async (req, res) => {
  try {
    const updated = await Banner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });

    res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const deleted = await Banner.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Banner not found" });

    res
      .status(200)
      .json({ success: true, message: "Banner deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
};
