const Favorites = require("../models/favorites.model");
const Property = require("../models/property.model");

const createFavoritesProperty = async (req, res) => {
  try {
    const { propertyId } = req.body;
    const userId = req.userId;

    if (!propertyId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Please enter required details.",
      });
    }

    const existingFavorite = await Favorites.findOne({ propertyId, userId });

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: "This property is already in your favorites.",
      });
    }

    const createdFavoritesDetails = await Favorites.create({
      propertyId,
      userId,
    });

    await Property.findByIdAndUpdate(
      propertyId,
      {
        $push: { favourite: userId },
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      createdFavoritesDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllByUser = async (req, res) => {
  try {
    const favoritesDetails = await Favorites.find({
      userId: req.userId,
    }).populate([{ path: "propertyId" }, { path: "userId" }]);

    if (favoritesDetails.length < 0) {
      return res.status(400).json({
        success: false,
        message: "No Record found.",
      });
    }

    return res.status(200).json({
      success: true,
      favoritesDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const removeFavorites = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Please enter required details.",
      });
    }

    const favorite = await Favorites.findById(id);

    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: "Favorite not found.",
      });
    }

    if (favorite.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to remove this favorite.",
      });
    }

    await Favorites.deleteOne({ _id: id });

    await Property.findByIdAndUpdate(
      favorite.propertyId,
      { $pullAll: { favourite: [userId] } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Favorite removed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createFavoritesProperty,
  getAllByUser,
  removeFavorites,
};
