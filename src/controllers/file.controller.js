const {
  cloudinary,
  uploadToCloudinary,
} = require("../services/cloudinary.service");
const File = require("../models/file.model");
const User = require("../models/user.model");
const Folder = require("../models/folder.model");
const buildFolderPath = require("../services/buildFolderPath.service");

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
    let { folderId, sharedWith } = req.body;

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

    const cloudinaryFolderPath = await buildFolderPath(folderId);

    const files = Array.isArray(req.files.file)
      ? req.files.file
      : [req.files.file];
    const uploadPromises = files.map((file) =>
      cloudinary.uploader.upload(file.path, {
        folder: cloudinaryFolderPath,
        resource_type: "auto",
      })
    );

    const uploadedFiles = await Promise.all(uploadPromises);

    const fileUrls = uploadedFiles.map(
      (uploadResult) => uploadResult.secure_url
    );

    let validSharedWith = [];

    if (sharedWith) {
      sharedWith = sharedWith
        .replace(/[\[\]]/g, "")
        .split(",")
        .map((id) => id.trim());

      const existingUsers = await User.find({ _id: { $in: sharedWith } });
      const existingUserIds = existingUsers.map((user) => user._id.toString());
      validSharedWith = sharedWith.filter((userId) =>
        existingUserIds.includes(userId)
      );
    }

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

const getAllFiles = async (req, res) => {
  try {
    const userId = req.userId;

    const files = await File.find({
      $or: [{ createdBy: userId }, { sharedWith: userId }],
    });

    return res.status(200).json({
      success: true,
      message: "Get all files successful",
      data: files,
    });
  } catch (error) {
    console.error("Error retrieving files: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve files",
      error: error.message,
    });
  }
};

const getFilesById = async (req, res) => {
  try {
    const userId = req.userId;

    const file = await File.find({
      _id: req.params.id,
      $or: [{ createdBy: userId }, { sharedWith: userId }],
    });

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Something went wrong",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Get file successful",
      data: file,
    });
  } catch (error) {
    console.error("Error retrieving file: ", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve file",
      error: error.message,
    });
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

    const deletedPaths = [];
    const failedDeletions = [];

    for (const file of filePath) {
      try {
        const matches = file.match(/upload\/(v\d+\/)?(.+)$/);
        if (!matches) {
          failedDeletions.push({
            path: file,
            reason: "Invalid file path format",
          });
          continue;
        }

        const pathPart = matches[2];
        const publicId = decodeURIComponent(pathPart).split(".")[0];

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === "ok") {
          deletedPaths.push(file);
        } else {
          failedDeletions.push({
            path: file,
            reason: `Cloudinary deletion failed: ${result.result}`,
          });
        }
      } catch (err) {
        failedDeletions.push({
          path: file,
          reason: err.message,
        });
        console.error(`Error deleting file: ${file}`, err);
      }
    }
    let updatedPaths = existingFile.path;
    let updatedNames = existingFile.name;

    deletedPaths.forEach((deletedPath) => {
      const index = updatedPaths.indexOf(deletedPath);
      if (index !== -1) {
        updatedPaths = [
          ...updatedPaths.slice(0, index),
          ...updatedPaths.slice(index + 1),
        ];
        updatedNames = [
          ...updatedNames.slice(0, index),
          ...updatedNames.slice(index + 1),
        ];
      }
    });

    if (updatedPaths.length === 0) {
      await File.deleteOne({ _id: id });
    } else {
      existingFile.path = updatedPaths;
      existingFile.name = updatedNames;
      await existingFile.save();
    }

    return res.status(200).json({
      success: true,
      message: "File deletion process completed",
      deletedFiles: {
        successful: deletedPaths,
        failed: failedDeletions,
      },
      successCount: deletedPaths.length,
      failureCount: failedDeletions.length,
      totalAttempted: filePath.length,
    });
  } catch (error) {
    console.error("Error in file removal process:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const deleteAllUploadedFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = await File.findById(fileId);
    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "File not found" });
    }

    let successfulDeletions = 0;
    let failedDeletions = [];

    if (file.path && file.path.length > 0) {
      const deletePromises = file.path.map(async (url) => {
        try {
          const matches = url.match(/upload\/(v\d+\/)?(.+)$/);
          if (!matches) {
            failedDeletions.push({
              url,
              error: "Invalid URL format",
            });
            return;
          }

          const publicId = decodeURIComponent(matches[2]).split(".")[0];

          const result = await cloudinary.uploader.destroy(publicId);

          if (result.result === "ok") {
            successfulDeletions++;
          } else {
            failedDeletions.push({
              url,
              error: `Cloudinary deletion failed: ${result.result}`,
            });
          }
        } catch (error) {
          failedDeletions.push({
            url,
            error: error.message,
          });
        }
      });

      await Promise.all(deletePromises);
    }

    await File.findByIdAndDelete(fileId);

    const response = {
      success: true,
      message: "File deletion completed",
      details: {
        totalFiles: file.path ? file.path.length : 0,
        successfulDeletions,
        failedDeletions: failedDeletions.length,
      },
    };

    if (failedDeletions.length > 0) {
      response.details.failures = failedDeletions;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete file",
      error: error.message,
    });
  }
};
module.exports = {
  uploadFile,
  getFilesInFolder,
  shareFile,
  unshareFile,
  removeFile,
  deleteAllUploadedFile,
  getAllFiles,
  getFilesById,
};
