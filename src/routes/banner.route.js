const express = require("express");
const bannerController = require("../controllers/banner.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.post("/createBanner",   upload.single("image"),  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), bannerController.createBanner);
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
router.put("/updateBanner/:id",upload.single("image"), auth(["isAdmin"]), bannerController.updateBanner);
router.delete("/deleteBanner/:id", auth(["isAdmin"]), bannerController.deleteBanner);

module.exports = router;
