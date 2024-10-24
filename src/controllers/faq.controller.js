const FAQ = require("../models/faq.model");
const createFAQ = async (req, res) => {
  try {
    const { title, description, question, answer } = req.body;

    const newFAQ = await FAQ.create({
      title,
      description,
      question,
      answer,
      createdBy: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: newFAQ,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllFaq = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = {};
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;
    const totalFaq = await FAQ.countDocuments(query);

    const faq = await FAQ.find(query).skip(skip).limit(pageSize);

    const totalPages = Math.ceil(totalFaq / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Get all faq successful",
      data: faq,
      meta: {
        totalFaq,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: faq.length,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve faq",
      error: error.message,
    });
  }
};

const getFaqById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(400).json({
        success: false,
        message: "FAQ is not found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Get Faq successful",
      data: faq,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve faq",
      error: error.message,
    });
  }
};

const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedFAQ = await FAQ.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!updatedFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      faq: updatedFAQ,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedFAQ = await FAQ.findByIdAndDelete(id);

    if (!deletedFAQ) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createFAQ,
  getAllFaq,
  getFaqById,
  updateFAQ,
  deleteFAQ,
};
