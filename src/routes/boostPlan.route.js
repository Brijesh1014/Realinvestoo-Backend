const express = require("express");
const router = express.Router();
const boostPlanController = require("../controllers/boostPlan.controller");
const auth = require("../middlewares/auth.middleware");


router.post("/createBoostPlan",auth(["isAdmin"]), boostPlanController.createBoostPlan);
router.get("/getAllBoostPlans",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), boostPlanController.getAllBoostPlans);
router.get("/getBoostPlanById/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), boostPlanController.getBoostPlanById);
router.put("/updateBoostPlan/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), boostPlanController.updateBoostPlan);
router.delete("/deleteBoostPlan/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), boostPlanController.deleteBoostPlan);

module.exports = router;
