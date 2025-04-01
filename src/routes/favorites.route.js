const express = require("express");
const auth = require("../middlewares/auth.middleware");
const FavoritesController = require("../controllers/favorites.controller");
const router = express.Router();

router.post(
  "/",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  FavoritesController.createFavoritesProperty
);

router.get(
  "/getAllByUser",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  FavoritesController.getAllByUser
);

router.delete(
  "/removeFavorites/:id",
  auth(["isBuyer", "isAdmin", "isSeller"]),
  FavoritesController.removeFavorites
);

module.exports = router;
