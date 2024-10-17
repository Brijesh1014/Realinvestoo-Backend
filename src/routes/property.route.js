const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const auth = require("../middlewares/auth.middleware");

router.post(
  "/createProperty",
  auth(["isEmp", "isAdmin"]),
  propertyController.createProperty
);

router.get(
  "/getAllProperties",
  auth(["isEmp", "isAdmin"]),
  propertyController.getAllProperties
);

router.get(
  "/getPropertyById/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.getPropertyById
);

router.put(
  "/updateProperty/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.updateProperty
);

router.delete(
  "/deleteProperty/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.deleteProperty
);

router.post(
  "/addReview/:propertyId",
  auth(["isEmp", "isAdmin"]),
  propertyController.addReview
);

router.post(
  "/createAppointment",
  auth(["isEmp", "isAdmin"]),
  propertyController.createAppointment
);

router.get(
  "/getAllAppointments",
  auth(["isEmp", "isAdmin"]),
  propertyController.getAllAppointments
);

module.exports = router;
