const express = require("express");
const router = express.Router();
const boostPlanController = require("../controllers/boostPlan.controller");
const auth = require("../middlewares/auth.middleware");


router.post("/createBoostPlan",auth(["isAdmin"]), boostPlanController.createBoostPlan);
router.get("/getAllBoostPlans",auth(["isAdmin"]), boostPlanController.getAllBoostPlans);
router.get("/getBoostPlanById/:id",auth(["isAdmin"]), boostPlanController.getBoostPlanById);
router.put("/updateBoostPlan/:id",auth(["isAdmin"]), boostPlanController.updateBoostPlan);
router.delete("/deleteBoostPlan/:id",auth(["isAdmin"]), boostPlanController.deleteBoostPlan);

module.exports = router;
