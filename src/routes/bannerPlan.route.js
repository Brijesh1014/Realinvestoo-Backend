const express = require("express");
const router = express.Router();
const bannerPlanController = require("../controllers/bannerPlan.controller");
const auth = require("../middlewares/auth.middleware");


router.post("/createBannerPlan",  auth([ "isAdmin"]), bannerPlanController.createBannerPlan);
router.get("/getBannerPlans",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), bannerPlanController.getBannerPlans);
router.get("/getBannerPlanById/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), bannerPlanController.getBannerPlanById);
router.put("/updateBannerPlan/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), bannerPlanController.updateBannerPlan);
router.delete("/deleteBannerPlan/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), bannerPlanController.deleteBannerPlan);

module.exports = router;
