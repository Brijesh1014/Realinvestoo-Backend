const Folder = require("../models/folder.model");
const User = require("../models/user.model");
const { cloudinary } = require("../services/cloudinary.service");

const handleErrorResponse = (res, error, message) => {
  console.error(message, error);
  return res.status(500).json({
    success: false,
    message,
    error: error.message,
  });
};

const createFolder = async (req, res) => {
  try {
    const { name, parentId, sharedWith } = req.body;

    if (Array.isArray(sharedWith)) {
      const existingUsers = await User.find({ _id: { $in: sharedWith } });
      const existingUserIds = existingUsers.map((user) => user._id.toString());

      const validSharedWith = sharedWith.filter((userId) =>
        existingUserIds.includes(userId)
      );

      const newFolder = new Folder({
        name,
        parentId: parentId || null,
        createdBy: req.userId,
        sharedWith: validSharedWith,
      });

      const savedFolder = await newFolder.save();

      const cloudinaryFolderPath = `/${name}`;
      await cloudinary.api.create_folder(cloudinaryFolderPath, {
        resource_type: "auto",
      });

      const shareUrl = `https://res.cloudinary.com/${
        cloudinary.config().cloud_name
      }/image/upload/v${cloudinaryFolderPath}`;

      return res.status(201).json({
        success: true,
        message: "Folder created successfully",
        data: {
          savedFolder,
          shareUrl,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "sharedWith should be an array",
      });
    }
  } catch (error) {
    console.error("Error creating folder: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create folder",
      error: error.message,
    });
  }
};

const getFolders = async (req, res) => {
  try {
    const userId = req.userId;

    const folders = await Folder.find({
      $or: [{ createdBy: userId }, { sharedWith: userId }],
    });

    return res.status(200).json({
      success: true,
      data: folders,
    });
  } catch (error) {
    console.error("Error retrieving folders: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve folders",
      error: error.message,
    });
  }
};

const getFoldersInFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.userId;

    const folders = await Folder.find({
      parentId: folderId,
      $or: [{ createdBy: userId }, { sharedWith: userId }],
    });

    return res.status(200).json({
      success: true,
      data: folders,
    });
  } catch (error) {
    return handleErrorResponse(res, error, "Failed to retrieve folders");
  }
};

const shareFolder = async (req, res) => {
  try {
    const { folderId, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (!folder.createdBy.equals(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to share this folder",
      });
    }

    const userToShareWith = await User.findById(userId);
    if (!userToShareWith) {
      return res.status(404).json({ message: "User not found" });
    }

    if (folder.sharedWith.includes(userId)) {
      return res
        .status(400)
        .json({ message: "Folder already shared with this user" });
    }

    folder.sharedWith.push(userId);
    await folder.save();

    return res.status(200).json({ message: "Folder shared successfully" });
  } catch (error) {
    console.error("Error sharing folder: ", error);
    return res
      .status(500)
      .json({ message: "Failed to share folder", error: error.message });
  }
};

const unshareFolder = async (req, res) => {
  try {
    const { folderId, userId } = req.body;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (!folder.createdBy.equals(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to unshare this folder",
      });
    }

    if (!folder.sharedWith.includes(userId)) {
      return res
        .status(400)
        .json({ message: "Folder not shared with this user" });
    }

    folder.sharedWith = folder.sharedWith.filter(
      (id) => id.toString() !== userId
    );
    await folder.save();

    return res.status(200).json({ message: "Folder unshared successfully" });
  } catch (error) {
    console.error("Error unsharing folder: ", error);
    return res
      .status(500)
      .json({ message: "Failed to unshare folder", error: error.message });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (!folder.createdBy.equals(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this folder",
      });
    }

    const files = await File.find({ folderId: folderId });
    if (files.length > 0) {
      const deletePromises = files.map(async (file) => {
        if (file.path && file.path.length > 0) {
          const cloudinaryDeletePromises = file.path.map(async (url) => {
            const publicIdWithFolder = url
              .split("/")
              .slice(-2)
              .join("/")
              .split(".")[0];
            return cloudinary.uploader.destroy(publicIdWithFolder);
          });
          await Promise.all(cloudinaryDeletePromises);
        }
      });

      await Promise.all(deletePromises);
    }

    await File.deleteMany({ folderId: folderId });

    await folder.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Folder and all its files deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return res
      .status(500)
      .json({ message: "Failed to delete folder", error: error.message });
  }
};

const createFolderWithUploadFile = async (req, res) => {
  try {
    const { name, parentId, sharedWith } = req.body;
    let validSharedWith = [];

    if (typeof sharedWith === "string") {
      validSharedWith = sharedWith
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((id) => id.trim());
    } else if (Array.isArray(sharedWith)) {
      validSharedWith = sharedWith;
    }

    const existingUsers = await User.find({ _id: { $in: validSharedWith } });
    const existingUserIds = existingUsers.map((user) => user._id.toString());
    validSharedWith = validSharedWith.filter((userId) =>
      existingUserIds.includes(userId)
    );

    const newFolder = new Folder({
      name,
      parentId: parentId || null,
      createdBy: req.userId,
      sharedWith: validSharedWith,
    });

    const savedFolder = await newFolder.save();

    const shareUrls = [];

    if (!req.files || !Array.isArray(req.files.files)) {
      return res.status(400).json({
        success: false,
        message: "files should be an array and not empty",
      });
    }

    const uploadPromises = req.files.files.map(async (file) => {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: name,
        resource_type: "auto",
      });

      return `https://res.cloudinary.com/${
        cloudinary.config().cloud_name
      }/image/upload/v${uploadResult.version}/${uploadResult.public_id}.${
        uploadResult.format
      }`;
    });

    const uploadedFilesUrls = await Promise.all(uploadPromises);
    shareUrls.push(...uploadedFilesUrls); 

    return res.status(201).json({
      success: true,
      message: "Folder and files created successfully",
      data: {
        savedFolder,
        shareUrls,
      },
    });
  } catch (error) {
    console.error("Error creating folder: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create folder",
      error: error.message,
    });
  }
};

module.exports = {
  createFolder,
  getFolders,
  getFoldersInFolder,
  shareFolder,
  unshareFolder,
  deleteFolder,
  createFolderWithUploadFile,
};
