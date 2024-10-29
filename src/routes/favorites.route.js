const express = require("express");
const auth = require("../middlewares/auth.middleware");
const FavoritesController = require("../controllers/favorites.controller");
const router = express.Router();

router.post(
  "/",
  auth(["isEmp", "isAdmin", "isUser"]),
  FavoritesController.createFavoritesProperty
);

router.get(
  "/getAllByUser",
  auth(["isEmp", "isAdmin", "isUser"]),
  FavoritesController.getAllByUser
);

router.delete(
  "/removeFavorites/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  FavoritesController.removeFavorites
);

module.exports = router;
