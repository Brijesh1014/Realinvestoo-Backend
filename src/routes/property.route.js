const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const auth = require("../middlewares/auth.middleware");

router.post(
  "/properties",
  auth(["isEmp", "isAdmin"]),
  propertyController.createProperty
);

router.get(
  "/properties",
  auth(["isEmp", "isAdmin"]),
  propertyController.getAllProperties
);

router.get(
  "/properties/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.getPropertyById
);

router.put(
  "/properties/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.updateProperty
);

router.delete(
  "/properties/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.deleteProperty
);

router.post(
  "/properties/reviews/:propertyId",
  auth(["isEmp", "isAdmin"]),
  propertyController.addReview
);

module.exports = router;
