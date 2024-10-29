const express = require("express");
const router = express.Router();
const upload = require("../services/multer.service");

const {
  createFolder,
  getFolders,
  shareFolder,
  createFolderWithUploadFile,
} = require("../controllers/folder.controller");
const auth = require("../middlewares/auth.middleware");

router.post("/folders", auth(["isEmp", "isAdmin", "isUser"]), createFolder);

router.post(
  "/createFolderWithUploadFile",
  auth(["isEmp", "isAdmin", "isUser"]),
  upload.fields([{ name: "files", maxCount: 10 }]),
  createFolderWithUploadFile
);

router.get("/folders", getFolders);

router.post("/folders/share", shareFolder);

module.exports = router;
