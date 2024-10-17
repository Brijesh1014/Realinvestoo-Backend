const Coupon = require("../models/coupon.model");

const createCoupon = async (req, res) => {
  try {
    let couponData = { createdBy: req.userId, ...req.body };
    const coupon = new Coupon(couponData);
    await coupon.save();
    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create coupon",
      error: error.message,
    });
  }
};

const getAllCoupon = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    const totalCoupons = await Coupon.countDocuments();

    const coupons = await Coupon.find().skip(skip).limit(limit);

    const totalPages = Math.ceil(totalCoupons / limit);

    const remainingPages = totalPages - page > 0 ? totalPages - page : 0;

    return res.status(200).json({
      success: true,
      message: "Get all coupons successful",
      data: coupons,
      meta: {
        totalCoupons,
        currentPage: page,
        totalPages,
        remainingPages,
        pageSize: coupons.length,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve coupons",
      error: error.message,
    });
  }
};

const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Get Coupon successful",
      data: coupon,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve coupon",
      error: error.message,
    });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      upsert: true,
      runValidators: true,
    });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update coupon",
      error: error.message,
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
      error: error.message,
    });
  }
};

module.exports = {
  createCoupon,
  getAllCoupon,
  getCouponById,
  updateCoupon,
  deleteCoupon,
};
