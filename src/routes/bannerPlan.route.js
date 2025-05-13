const express = require("express");
const router = express.Router();
const bannerPlanController = require("../controllers/bannerPlan.controller");
const auth = require("../middlewares/auth.middleware");


router.post("/createBannerPlan",auth(["isAdmin"]), bannerPlanController.createBannerPlan);
router.get("/getBannerPlans",auth(["isAdmin"]), bannerPlanController.getBannerPlans);
router.get("/getBannerPlanById/:id",auth(["isAdmin"]), bannerPlanController.getBannerPlanById);
router.put("/updateBannerPlan/:id",auth(["isAdmin"]), bannerPlanController.updateBannerPlan);
router.delete("/deleteBannerPlan/:id",auth(["isAdmin"]), bannerPlanController.deleteBannerPlan);

module.exports = router;
