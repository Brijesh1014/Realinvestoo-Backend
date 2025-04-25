const express = require("express");
const adminController = require("../controllers/admin.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.get("/getAllUsers", auth(["isAdmin"]), adminController.getAllUsers);
router.delete("/deleteUser/:id", auth(["isAdmin"]), adminController.deleteUser);

router.get("/fetchAllUsers", auth(["isAdmin"]), adminController.fetchAllUsers);
router.post("/approveUser/:id",auth(["isAdmin"]),adminController.approveUser)

module.exports = router;
