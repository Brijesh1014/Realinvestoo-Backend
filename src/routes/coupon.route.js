const express = require("express");
const couponController = require("../controllers/coupon.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.post("/createCoupon", auth(["isAdmin"]), couponController.createCoupon);
router.get(
  "/getAllCoupons",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  couponController.getAllCoupon
);
router.get(
  "/getCouponById/:id",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  couponController.getCouponById
);
router.put(
  "/updateCoupon/:id",
  auth(["isAdmin"]),
  couponController.updateCoupon
);
router.delete(
  "/deleteCoupon/:id",
  auth(["isAdmin"]),
  couponController.deleteCoupon
);

module.exports = router;
