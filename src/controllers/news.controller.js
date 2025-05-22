const { default: mongoose } = require("mongoose");
const News = require("../models/news.model");
const NewsCategory = require("../models/newsCategory.model");
const {
  uploadToCloudinary,
  cloudinary,
} = require("../services/cloudinary.service");

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
    const categories = await NewsCategory.find()
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Fetched all categories successfully",
      data: categories,
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

    await News.updateMany({ category: id }, { $set: { category: null } });

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
    const { title, description, creatorName, dateOfPost, status } = req.body;

    let categories = [];
    if (req.body.category) {
      try {
        categories = req.body.category
          .replace(/[\[\]]/g, "")
          .split(",")
          .map((id) => id.trim());
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid category format",
        });
      }
    }

    if (categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one category is required",
      });
    }

    const validObjectIds = categories.every((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (!validObjectIds) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format",
      });
    }

    const categoryChecks = await Promise.all(
      categories.map((categoryId) => NewsCategory.findById(categoryId))
    );

    const missingCategories = categoryChecks.filter((cat) => !cat);

    if (missingCategories.length > 0) {
      return res.status(404).json({
        success: false,
        message: "One or more categories not found",
      });
    }

    let imageUrl;
    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "The uploaded file must be an image",
        });
      }

      imageUrl = await uploadToCloudinary(req.file);
    }

    const news = new News({
      title,
      category: categories,
      description,
      image: imageUrl || null,
      creatorName,
      dateOfPost: dateOfPost || new Date(),
      createdBy: req.userId,
      status,
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
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const skip = (pageNumber - 1) * pageSize;

    const totalNewsCount = await News.countDocuments();

    const news = await News.find()
      .populate("category", "name")
      .populate("createdBy", "username")
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

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
        pageSize: news.length,
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
    const { title, description, creatorName, dateOfPost, status } = req.body;

    const existingNews = await News.findById(id);
    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    let categories = existingNews.category;
    if (req.body.category) {
      try {
        categories = req.body.category
          .replace(/[\[\]]/g, "")
          .split(",")
          .map((id) => id.trim());

        const validObjectIds = categories.every((id) =>
          mongoose.Types.ObjectId.isValid(id)
        );

        if (!validObjectIds) {
          return res.status(400).json({
            success: false,
            message: "Invalid category ID format",
          });
        }

        const categoryChecks = await Promise.all(
          categories.map((categoryId) => NewsCategory.findById(categoryId))
        );

        const missingCategories = categoryChecks.filter((cat) => !cat);

        if (missingCategories.length > 0) {
          return res.status(404).json({
            success: false,
            message: "One or more categories not found",
          });
        }
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid category format",
        });
      }
    }

    let imageUrl = existingNews.image;
    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "The uploaded file must be an image",
        });
      }

      let existingImagePublicId;
      if (existingNews.image) {
        existingImagePublicId = existingNews.image
          .split("/")
          .pop()
          .split(".")[0];

        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
          public_id: existingImagePublicId,
          overwrite: true,
        });

        imageUrl = uploadResult.secure_url;
      } else {
        const uploadResult = await cloudinary.uploader.upload(req.file.path);
        imageUrl = uploadResult.secure_url;
      }
    }

    const updatedNews = await News.findByIdAndUpdate(
      id,
      {
        title,
        category: categories,
        description,
        creatorName,
        dateOfPost: dateOfPost || new Date(),
        image: imageUrl,
        status,
      },
      { new: true }
    );

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

    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    if (news.image) {
      const imagePublicId = news.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(imagePublicId);
    }
    await News.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "News deleted successfully",
      data: news,
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
