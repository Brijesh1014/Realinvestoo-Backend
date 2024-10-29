const Property = require("../models/property.model");
const Likes = require("../models/like.model");

const like = async (req, res) => {
  try {
    const { isLike, propertyId } = req.body;

    if (!propertyId) {
      return res
        .status(400)
        .json({ success: false, message: "Property ID is required" });
    }

    const property = await Property.findById(propertyId);

    if (!property) {
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });
    }

    const existingLike = await Likes.findOne({
      propertyId: propertyId,
      userId: req.userId,
    });

    if (isLike) {
      if (existingLike) {
        if (existingLike.isLike) {
          return res.status(400).json({
            success: false,
            message: "User has already liked this property",
          });
        } else {
          existingLike.isLike = true;
          await existingLike.save();
        }
      } else {
        const newLike = new Likes({
          propertyId: propertyId,
          userId: req.userId,
          isLike: true,
        });
        await newLike.save();

        property.likes.push(newLike._id);
      }
    } else {
      if (!existingLike) {
        return res.status(400).json({
          success: false,
          message: "User has not liked this property",
        });
      } else if (!existingLike.isLike) {
        return res
          .status(400)
          .json({ message: "User has already disliked this property" });
      } else {
        existingLike.isLike = false;
        await existingLike.save();
      }
    }

    await property.save();

    res.status(200).json({
      success: true,
      message: "Like status updated successfully",
      data: property,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update liked properties",
      error: error.message,
    });
  }
};

const getUserLikedProperties = async (req, res) => {
  try {
    if (!req.userId) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized access" });
    }

    const userLikes = await Likes.find({ userId: req.userId }).select(
      "propertyId"
    );

    if (userLikes.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No liked properties found" });
    }

    const likedPropertyIds = userLikes.map((like) => like.propertyId);

    const likedProperties = await Property.find({
      _id: { $in: likedPropertyIds },
    })
      .populate("likes")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Liked properties retrieved successfully",
      data: likedProperties,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve liked properties",
      error: error.message,
    });
  }
};

module.exports = { like, getUserLikedProperties };
