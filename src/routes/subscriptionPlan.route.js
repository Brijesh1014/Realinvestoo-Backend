const express = require("express");
const router = express.Router();
const subscriptionPlanController = require("../controllers/subscriptionPlan.controller");
const auth = require("../middlewares/auth.middleware");

router.post("/createSubscriptionPlan", auth([ "isAdmin"]), subscriptionPlanController.createSubscriptionPlan);
router.get("/getAllSubscriptionPlans",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), subscriptionPlanController.getAllSubscriptionPlans);
router.get("/getSubscriptionPlanById/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), subscriptionPlanController.getSubscriptionPlanById);
router.put("/updateSubscriptionPlan/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), subscriptionPlanController.updateSubscriptionPlan);
router.delete("/deleteSubscriptionPlan/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), subscriptionPlanController.deleteSubscriptionPlan);
router.post("/purchaseSubscribePlan",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),subscriptionPlanController.purchaseSubscribePlan)

module.exports = router;
