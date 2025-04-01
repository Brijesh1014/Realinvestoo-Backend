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
router.get(
  "/getUserById/:id",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  userController.getUserById
);
module.exports = router;
