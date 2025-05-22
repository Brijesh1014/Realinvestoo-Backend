const CmsPage = require("../models/cmsPage.model");

const createCmsPage = async (req, res) => {
  try {
    const { title, slug, content } = req.body;

    if (!title || !slug || !content) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Title, Slug, and Content are required.",
        });
    }

    const existing = await CmsPage.findOne({ slug });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Slug must be unique." });
    }

    const newPage = new CmsPage({ ...req.body, createdBy: req.userId });
    await newPage.save();
    res
      .status(201)
      .json({
        success: true,
        message: "CMS page created successfully",
        data: newPage,
      });
  } catch (error) {
    console.error("Create Cms page Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAllCmsPages = async (req, res) => {
  try {
    const pages = await CmsPage.find().sort({ createdAt: -1 });
    res
      .status(200)
      .json({
        success: true,
        message: "Cms pages fetched successfully",
        data: pages,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getCmsPageById = async (req, res) => {
  try {
    const page = await CmsPage.findById(req.params.id);
    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Cms page not found" });
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Cms page fetched successfully",
        data: page,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateCmsPage = async (req, res) => {
  try {
    const updatedPage = await CmsPage.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!updatedPage) {
      return res
        .status(404)
        .json({ success: false, message: "Cms page not found" });
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Cms page updated successfully",
        data: updatedPage,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteCmsPage = async (req, res) => {
  try {
    const deletedPage = await CmsPage.findByIdAndDelete(req.params.id);
    if (!deletedPage) {
      return res
        .status(404)
        .json({ success: false, message: "Cms page not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Cms page deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  createCmsPage,
  getAllCmsPages,
  getCmsPageById,
  updateCmsPage,
  deleteCmsPage,
};
