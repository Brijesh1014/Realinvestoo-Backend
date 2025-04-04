const express = require("express");
const passport = require("passport");
const authController = require("../controllers/auth.controller");
require("../services/passport.service");
const auth = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/register", authController.register);
router.post("/checkEmailOrPhoneNumber", authController.checkEmailOrPhoneNumber);
router.post("/login", authController.login);
router.post("/refreshToken", authController.refreshToken);

router.post("/forgetPassword", authController.forgetPassword);
router.post("/verifyOtp", authController.verifyOtp);
router.put("/resetPassword", authController.resetPassword);
router.post("/resendOtp", authController.resendOtp);
router.post(
  "/changePassword",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  authController.changePassword
);
router.post(
  "/logout",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  authController.logout
);
router.post("/google", authController.googleAuth);
router.post("/apple", authController.appleAuth);
router.post("/googleLogin", authController.googleLogin);
router.put("/saveFcmToken", authController.saveFcmToken);

module.exports = router;
