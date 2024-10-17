const express = require("express");
const userController = require("../controllers/user.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.get(
  "/getAllAgents",
  auth(["isEmp", "isAdmin"]),
  userController.getAllAgents
);

module.exports = router;
