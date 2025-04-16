const Banner = require("../models/banner.model");

const createBanner = async (req, res) => {
  try {
    const { title, description, link, image } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required fields.",
      });
    }

    const banner = new Banner({
      title,
      description,
      link,
      image,
      createdBy: req.userId,
    });

    await banner.save();

    res.status(201).json({
      success: true,
      message: "Banner is created successfully",
      data: banner,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAllBanners = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    const totalBanners = await Banner.countDocuments();
    const banners = await Banner.find()
      .populate("createdBy", "name email")
      .skip(skip)
      .limit(limit);
    const totalPages = Math.ceil(totalBanners / limit);

    const remainingPages = totalPages - page > 0 ? totalPages - page : 0;

    res.status(200).json({
      success: true,
      message: "Get all banners successfully",
      data: banners,
      meta: {
        totalBanners,
        currentPage: page,
        totalPages,
        remainingPages,
        pageSize: banners.length,
      },
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

    res
      .status(200)
      .json({ success: true, message: "Get Banner successfully", data: banner });
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
