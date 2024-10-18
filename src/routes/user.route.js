const express = require("express");
const userController = require("../controllers/user.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.get(
  "/getAllAgents",
  auth(["isEmp", "isAdmin"]),
  userController.getAllAgents
);
router.put(
  "/editProfile/:id",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent"]),
  userController.editProfile
);
router.get(
  "/getUserById/:id",
  auth(["isEmp", "isAdmin"]),
  userController.getUserById
);
module.exports = router;
