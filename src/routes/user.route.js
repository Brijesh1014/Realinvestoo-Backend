const express = require("express");
const userController = require("../controllers/user.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.get(
  "/getAllAgents",
  auth(["isEmp", "isAdmin", "isUser"]),
  userController.getAllAgents
);
router.put(
  "/editProfile",
  upload.single("profileImage"),
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  userController.editProfile
);
router.get(
  "/getUserById/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  userController.getUserById
);
module.exports = router;
