const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");
const upload = require("../services/multer.service");

const auth = require("../middlewares/auth.middleware");

router.post(
  "/file",
  auth(["isEmp", "isAdmin", "isUser"]),
  upload.fields([{ name: "file", maxCount: 10 }]),
  fileController.uploadFile
);

router.get(
  "/getFilesInFolder/:folderId",
  auth(["isEmp", "isAdmin", "isUser"]),
  fileController.getFilesInFolder
);

router.put(
  "/removeFile",
  auth(["isEmp", "isAdmin", "isUser"]),
  fileController.removeFile
);

router.put(
  "/shareFile",
  auth(["isEmp", "isAdmin", "isUser"]),
  fileController.shareFile
);

router.put(
  "/unshareFile",
  auth(["isEmp", "isAdmin", "isUser"]),
  fileController.unshareFile
);

router.delete(
  "/deleteFile/:fileId",
  auth(["isEmp", "isAdmin", "isUser"]),
  fileController.deleteFile
);

module.exports = router;
