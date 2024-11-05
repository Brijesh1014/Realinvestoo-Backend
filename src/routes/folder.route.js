const express = require("express");
const router = express.Router();
const upload = require("../services/multer.service");

const {
  createFolder,
  getFolders,
  shareFolder,
  createFolderWithUploadFile,
  unshareFolder,
  deleteFolder,
  getFolderById,
} = require("../controllers/folder.controller");
const auth = require("../middlewares/auth.middleware");

router.post(
  "/createFolder",
  auth(["isEmp", "isAdmin", "isUser"]),
  createFolder
);

router.post(
  "/createFolderWithUploadFile",
  auth(["isEmp", "isAdmin", "isUser"]),
  upload.fields([{ name: "files", maxCount: 10 }]),
  createFolderWithUploadFile
);

router.get("/getAllFolders", auth(["isEmp", "isAdmin", "isUser"]), getFolders);

router.get(
  "/getFolderById/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  getFolderById
);

router.post("/shareFolder", auth(["isEmp", "isAdmin", "isUser"]), shareFolder);

router.put(
  "/unshareFolder",
  auth(["isEmp", "isAdmin", "isUser"]),
  unshareFolder
);

router.delete(
  "/deleteFolder/:folderId",
  auth(["isEmp", "isAdmin", "isUser"]),
  deleteFolder
);

module.exports = router;
