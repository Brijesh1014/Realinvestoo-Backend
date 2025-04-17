const express = require("express");
const router = express.Router();
const cmsController = require("../controllers/cmsPage.controller");
const auth = require("../middlewares/auth.middleware");


router.post("/createCmsPage",auth(["isAdmin"]), cmsController.createCmsPage);
router.get("/getAllCmsPages",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), cmsController.getAllCmsPages);
router.get("/getCmsPageById/:id",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]), cmsController.getCmsPageById);
router.put("/updateCmsPage/:id",  auth([ "isAdmin"]), cmsController.updateCmsPage);
router.delete("/deleteCmsPage/:id",  auth([ "isAdmin"]), cmsController.deleteCmsPage);

module.exports = router;
