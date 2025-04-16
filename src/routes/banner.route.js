const express = require("express");
const bannerController = require("../controllers/banner.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.post("/createBanner", auth(["isAdmin"]), bannerController.createBanner);
router.get(
  "/getAllBanners",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  bannerController.getAllBanners
);
router.get(
  "/getBannerById/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  bannerController.getBannerById
);
router.put("/updateBanner/:id", auth(["isAdmin"]), bannerController.updateBanner);
router.delete("/deleteBanner/:id", auth(["isAdmin"]), bannerController.deleteBanner);

module.exports = router;
