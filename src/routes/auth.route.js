const express = require("express");
const passport = require("passport");
const authController = require("../controllers/auth.controller");
require("../services/passport.service");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  authController.googleLogin
);

router.post("/forget-password", authController.forgetPassword);
router.post("/verify-otp", authController.verifyOtp);
router.put("/reset-password", authController.resetPassword);
router.post("/resend-otp", authController.resendOtp);
router.post("/change-password", authController.changePassword);

module.exports = router;
