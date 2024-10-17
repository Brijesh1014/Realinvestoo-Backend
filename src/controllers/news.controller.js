const News = require("../models/news.model");
const NewsCategory = require("../models/newsCategory.model");

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const category = new NewsCategory({
      name,
      createdBy: req.userId,
    });

    await category.save();

    return res.status(201).json({
      success: true,
      message: "News category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating category",
      error: error.message,
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default page 1 and limit 10

    // Convert `page` and `limit` to integers
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    // Calculate how many documents to skip for pagination
    const skip = (pageNumber - 1) * pageSize;

    // Get the total count of categories
    const totalCategoriesCount = await NewsCategory.countDocuments();

    // Fetch the categories with pagination
    const categories = await NewsCategory.find()
      .populate("createdBy", "username") // Populate with creator's username
      .skip(skip)
      .limit(pageSize);

    // Calculate total pages and remaining pages
    const totalPages = Math.ceil(totalCategoriesCount / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Fetched all categories successfully",
      data: categories,
      meta: {
        totalCategoriesCount,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: categories.length, // Actual number of results returned
      },
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching categories",
      error: error.message,
    });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await NewsCategory.findById(id).populate(
      "createdBy",
      "username"
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category retrieved successfully",
      data: category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching category",
      error: error.message,
    });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updatedCategory = await NewsCategory.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await NewsCategory.findByIdAndDelete(id);

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
      data: deletedCategory,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting category",
      error: error.message,
    });
  }
};

const createNews = async (req, res) => {
  try {
    const { title, category, description, image, creatorName, dateOfPost } =
      req.body;

    const existingCategory = await NewsCategory.findById(category);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const news = new News({
      title,
      category,
      description,
      image,
      creatorName,
      dateOfPost: dateOfPost || new Date(),
      createdBy: req.userId,
    });

    await news.save();

    return res.status(201).json({
      success: true,
      message: "News created successfully",
      data: news,
    });
  } catch (error) {
    console.error("Error creating news:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating news",
      error: error.message,
    });
  }
};

const getAllNews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; // Default page 1 and limit 10

    // Convert `page` and `limit` to integers
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    // Calculate how many documents to skip for pagination
    const skip = (pageNumber - 1) * pageSize;

    // Get the total count of documents
    const totalNewsCount = await News.countDocuments();

    // Fetch the news with pagination
    const news = await News.find()
      .populate("category", "name")
      .populate("createdBy", "username")
      .skip(skip)
      .limit(pageSize);

    // Calculate total pages and remaining pages
    const totalPages = Math.ceil(totalNewsCount / pageSize);
    const remainingPages =
      totalPages - pageNumber > 0 ? totalPages - pageNumber : 0;

    return res.status(200).json({
      success: true,
      message: "Fetched all news successfully",
      data: news,
      meta: {
        totalNewsCount,
        currentPage: pageNumber,
        totalPages,
        remainingPages,
        pageSize: news.length, // Actual number of results returned
      },
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching news",
      error: error.message,
    });
  }
};

const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;

    const newsItem = await News.findById(id)
      .populate("category", "name")
      .populate("createdBy", "username");

    if (!newsItem) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "News retrieved successfully",
      data: newsItem,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching news",
      error: error.message,
    });
  }
};

const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, image, creatorName, dateOfPost } =
      req.body;

    // Check if the category exists
    const existingCategory = await NewsCategory.findById(category);
    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const updatedNews = await News.findByIdAndUpdate(
      id,
      {
        title,
        category, // Reference ID
        description,
        image,
        creatorName,
        dateOfPost: dateOfPost || new Date(),
      },
      { new: true }
    );

    if (!updatedNews) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "News updated successfully",
      data: updatedNews,
    });
  } catch (error) {
    console.error("Error updating news:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating news",
      error: error.message,
    });
  }
};

const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedNews = await News.findByIdAndDelete(id);

    if (!deletedNews) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "News deleted successfully",
      data: deletedNews,
    });
  } catch (error) {
    console.error("Error deleting news:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting news",
      error: error.message,
    });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createNews,
  getAllNews,
  getNewsById,
  updateNews,
  deleteNews,
};
