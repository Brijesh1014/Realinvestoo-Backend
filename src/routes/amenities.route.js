const express = require("express");
const router = express.Router();

const amenitiesController = require("../controllers/amenities.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.post(
  "/property/createAmenities",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  upload.single("image"),
  amenitiesController.createAmenities
);
router.get(
  "/property/getAllAmenities",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  amenitiesController.getAllAmenities
);
router.get(
  "/property/getAmenitiesTypeById/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  amenitiesController.getAmenitiesTypeById
);

router.put(
  "/property/updateAmenities/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  upload.single("image"),
  amenitiesController.updateAmenities
);
router.delete(
  "/property/deleteAmenities/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  amenitiesController.deleteAmenities
);

module.exports = router