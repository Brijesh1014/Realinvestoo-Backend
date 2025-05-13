const express = require("express");
const router = express.Router();
const subscriptionPlanController = require("../controllers/subscriptionPlan.controller");

router.post("/createSubscriptionPlan", subscriptionPlanController.createSubscriptionPlan);
router.get("/getAllSubscriptionPlans", subscriptionPlanController.getAllSubscriptionPlans);
router.get("/getSubscriptionPlanById/:id", subscriptionPlanController.getSubscriptionPlanById);
router.put("/updateSubscriptionPlan/:id", subscriptionPlanController.updateSubscriptionPlan);
router.delete("/deleteSubscriptionPlan/:id", subscriptionPlanController.deleteSubscriptionPlan);

module.exports = router;
