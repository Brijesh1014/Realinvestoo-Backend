const express = require("express");
const adminController = require("../controllers/admin.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.get("/getAllUsers", auth(["isAdmin"]), adminController.getAllUsers);
router.delete("/deleteUser", auth(["isAdmin"]), adminController.deleteUser);

module.exports = router;
