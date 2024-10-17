const express = require("express");
const passport = require("passport");
const authController = require("../controllers/auth.controller");
require("../services/passport.service");
const auth = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

// router.get(
//   "/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );

// router.get(
//   "/google/callback",
//   passport.authenticate("google", { session: false }),
//   (req, res) => {
//     const accessToken = req.user.tokens; // Access the tokens generated in the strategy
//     res.json({ data: req.user, accessToken });
//   }
// );

router.post("/forgetPassword", authController.forgetPassword);
router.post("/verifyOtp", authController.verifyOtp);
router.put("/resetPassword", authController.resetPassword);
router.post("/resendOtp", authController.resendOtp);
router.post("/changePassword", authController.changePassword);
router.post(
  "/editProfile/:id",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  authController.editProfile
);
router.post(
  "/logout",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  authController.logout
);
router.post("/google", authController.googleAuth);
router.post("/googleLogin", authController.googleLogin);

module.exports = router;
