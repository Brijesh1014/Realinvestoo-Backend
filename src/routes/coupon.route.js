const express = require("express");
const couponController = require("../controllers/coupon.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.post(
  "/createCoupon",
  upload.single("couponImage"),
  auth(["isAdmin"]),
  couponController.createCoupon
);
router.get(
  "/getAllCoupons",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  couponController.getAllCoupon
);
router.get(
  "/getCouponById/:id",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  couponController.getCouponById
);
router.put(
  "/updateCoupon/:id",
  upload.single("couponImage"),
  auth(["isAdmin"]),
  couponController.updateCoupon
);
router.delete(
  "/deleteCoupon/:id",
  auth(["isAdmin"]),
  couponController.deleteCoupon
);

module.exports = router;
