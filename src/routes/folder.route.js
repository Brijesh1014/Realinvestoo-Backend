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
  auth(["isBuyer", "isAdmin", "isSeller"]),
  createFolder
);

router.post(
  "/createFolderWithUploadFile",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  upload.fields([{ name: "files", maxCount: 10 }]),
  createFolderWithUploadFile
);

router.get("/getAllFolders", auth(["isBuyer", "isAdmin", "isSeller"]), getFolders);

router.get(
  "/getFolderById/:id",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  getFolderById
);

router.post("/shareFolder", auth(["isBuyer", "isAdmin", "isSeller"]), shareFolder);

router.put(
  "/unshareFolder",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  unshareFolder
);

router.delete(
  "/deleteFolder/:folderId",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  deleteFolder
);

module.exports = router;
