const express = require("express");
const userController = require("../controllers/user.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.get(
  "/getAllAgents",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  userController.getAllAgents
);
router.put(
  "/editProfile",
  upload.single("profileImage"),
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  userController.editProfile
);
router.patch(
  "/uploadDocument",
  upload.single("document"),
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  userController.uploadDocument
);
router.get(
  "/getUserById/:id",
  auth(["isBuyer", "isAdmin", "isSeller","isAgent"]),
  userController.getUserById
);
router.get(
  "/getPaymentHistory",
  auth(["isBuyer", "isAdmin", "isSeller","isAgent"]),
  userController.getPaymentHistory
);
router.get(
  "/getUserBoostedProperties",
  auth(["isBuyer", "isAdmin", "isSeller","isAgent"]),
  userController.getUserBoostedProperties
);
module.exports = router;
