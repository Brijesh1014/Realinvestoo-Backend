const {
  cloudinary,
  uploadToCloudinary,
} = require("../services/cloudinary.service");
const File = require("../models/file.model");
const User = require("../models/user.model");
const Folder = require("../models/folder.model");

const handleErrorResponse = (res, error, message) => {
  console.error(message, error);
  return res.status(500).json({
    success: false,
    message,
    error: error.message,
  });
};

const uploadFile = async (req, res) => {
  try {
    const { folderId } = req.body;
    let sharedWith = req.body.sharedWith;

    if (typeof sharedWith === "string") {
      sharedWith = sharedWith
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((id) => id.trim());
    } else if (!Array.isArray(sharedWith)) {
      sharedWith = [sharedWith];
    }

    if (!req.files || !req.files.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res
        .status(404)
        .json({ success: false, message: "Folder not found" });
    }

    const files = req.files.file;

    const uploadPromises = files.map((file) =>
      cloudinary.uploader.upload(file.path, {
        folder: `${folder.name}`,
        resource_type: "auto",
      })
    );

    const uploadedFiles = await Promise.all(uploadPromises);

    const fileUrls = uploadedFiles.map(
      (uploadResult) => uploadResult.secure_url
    );

    const existingUsers = await User.find({ _id: { $in: sharedWith } });
    const existingUserIds = existingUsers.map((user) => user._id.toString());
    const validSharedWith = sharedWith.filter((userId) =>
      existingUserIds.includes(userId)
    );

    const newFile = new File({
      name: files.map((file) => file.originalname),
      path: fileUrls,
      folderId,
      createdBy: req.userId,
      sharedWith: validSharedWith,
    });

    const savedFile = await newFile.save();

    return res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: savedFile,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message,
    });
  }
};

const getFilesInFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.userId;
    const files = await File.find({
      folderId,
      $or: [{ createdBy: userId }, { sharedWith: userId }],
    });

    return res.status(200).json({
      success: true,
      data: files,
    });
  } catch (error) {
    return handleErrorResponse(res, error, "Failed to retrieve files");
  }
};

const shareFile = async (req, res) => {
  try {
    const { fileId, userId } = req.body;

    const userToShareWith = await User.findById(userId);
    if (!userToShareWith) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    if (!file.createdBy.equals(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to share this file",
      });
    }

    if (file.sharedWith.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "File already shared with this user",
      });
    }

    file.sharedWith.push(userId);
    await file.save();

    return res
      .status(200)
      .json({ success: true, message: "File shared successfully" });
  } catch (error) {
    return handleErrorResponse(res, error, "Failed to share file");
  }
};

const unshareFile = async (req, res) => {
  try {
    const { fileId, userId } = req.body;

    const file = await File.findById(fileId);
    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    if (!file.createdBy.equals(req.userId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to unshare this file",
      });
    }

    if (!file.sharedWith.includes(userId)) {
      return res
        .status(400)
        .json({ success: false, message: "File not shared with this user" });
    }

    file.sharedWith = file.sharedWith.filter((id) => id.toString() !== userId);
    await file.save();

    return res
      .status(200)
      .json({ success: true, message: "File unshared successfully" });
  } catch (error) {
    return handleErrorResponse(res, error, "Failed to unshare file");
  }
};

const removeFile = async (req, res) => {
  try {
    const { filePath, id } = req.body;

    if (!filePath || !Array.isArray(filePath) || filePath.length === 0) {
      return res
        .status(400)
        .json({ message: "No files specified for removal" });
    }

    const existingFile = await File.findById(id);
    if (!existingFile) {
      return res.status(404).json({ message: "File not found" });
    }

    if (!existingFile.createdBy.equals(req.userId)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to remove this file" });
    }

    for (const file of filePath) {
      const publicId = file.split("/").slice(-2).join("/").split(".")[0];

      await cloudinary.uploader.destroy(publicId);

      const index = existingFile.path.indexOf(file);
      if (index !== -1) {
        existingFile.path.splice(index, 1);
        existingFile.name.splice(index, 1);
      }
    }

    await existingFile.save();

    return res
      .status(200)
      .json({ success: true, message: "File(s) removed successfully" });
  } catch (error) {
    console.error("Error removing file(s):", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    if (file.path && file.path.length > 0) {
      const deletePromises = file.path.map(async (url) => {
        const publicIdWithFolder = url
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];

        return cloudinary.uploader.destroy(publicIdWithFolder);
      });

      await Promise.all(deletePromises);
    }

    await File.findByIdAndDelete(fileId);

    return res.status(200).json({
      success: true,
      message: "File deleted successfully from Cloudinary and database",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return res
      .status(500)
      .json({ message: "Failed to delete file", error: error.message });
  }
};

module.exports = {
  uploadFile,
  getFilesInFolder,
  shareFile,
  unshareFile,
  removeFile,
  deleteFile,
};
