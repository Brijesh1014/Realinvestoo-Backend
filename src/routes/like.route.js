const express = require("express");
const likeController = require("../controllers/like.controller");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");

router.post(
  "/",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  likeController.like
);
router.get(
  "/getUserLikedProperties",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  likeController.getUserLikedProperties
);

module.exports = router;
