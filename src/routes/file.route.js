const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const upload = require("../services/multer.service");

const auth = require("../middlewares/auth.middleware");

router.post(
  "/file",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  upload.fields([{ name: "file", maxCount: 10 }]),
  fileController.uploadFile
);

router.get(
  "/getFilesInFolder/:folderId",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  fileController.getFilesInFolder
);

router.put(
  "/removeFile",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  fileController.removeFile
);

router.put(
  "/shareFile",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  fileController.shareFile
);

router.put(
  "/unshareFile",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  fileController.unshareFile
);

router.delete(
  "/deleteAllUploadedFile/:fileId",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  fileController.deleteAllUploadedFile
);

router.get(
  "/getAllFiles",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  fileController.getAllFiles
);

router.get(
  "/getFileById/:id",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  fileController.getFilesById
);

module.exports = router;
