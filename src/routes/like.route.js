const express = require("express");
const likeController = require("../controllers/like.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.post(
  "/",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  likeController.like
);
router.get(
  "/getUserLikedProperties",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  likeController.getUserLikedProperties
);

module.exports = router;
