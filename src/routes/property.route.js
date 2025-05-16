const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

// Property
router.post(
  "/createProperty",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.createProperty
);
router.get(
  "/getAllProperties",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getAllProperties
);
router.get(
  "/getTopRatedProperties",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getTopRatedProperties
);
router.get(
  "/getAllOwnProperties",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getAllOwnProperties
);
router.get(
  "/getPropertyById/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getPropertyById
);
router.put(
  "/updateProperty/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.updateProperty
);
router.put(
  "/uploadNewSliderImages/:id",
  upload.fields([{ name: "sliderPhotos", maxCount: 10 }]),
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.uploadNewSliderPhoto
);
router.post(
  "/removePropertyImages",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.removePropertyImages
);
router.delete(
  "/deleteProperty/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.deleteProperty
);

router.post(
  "/addReview/:propertyId",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.addReview
);
router.post(
  "/createAppointment",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.createAppointment
);
router.get(
  "/getAllAppointments",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getAllAppointments
);
router.get(
  "/getAppointmentById/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getAppointmentById
);
router.get(
  "/getUserAppointments",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getUserAppointments
);
router.put(
  "/updateAppointment/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.updateAppointment
);
router.delete(
  "/deleteAppointment/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.deleteAppointment
);
router.get(
  "/analyticDashboard",
  auth(["isAdmin"]),
  propertyController.analyticDashboard
);
router.get(
  "/getPropertyByAgentId/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getPropertyByAgentId
);

// File and image upload

router.post(
  "/upload",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  upload.fields([{ name: "file", maxCount: 10 }]),
  propertyController.uploadFile
);
router.delete(
  "/deleteFile",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.deleteFile
);

// Property Listing Type

router.post(
  "/createPropertyListingType",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.createPropertyListingType
);
router.get(
  "/getAllPropertyListingTypes",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getAllPropertyListingTypes
);
router.get(
  "/getPropertyListingTypeById/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getPropertyListingTypeById
);

router.put(
  "/updatePropertyListingType/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.updatePropertyListingType
);
router.delete(
  "/deletePropertyListingType/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.deletePropertyListingType
);

// Property Type

router.post(
  "/createPropertyType",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.createPropertyType
);

router.get(
  "/getAllPropertyType",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getAllPropertyType
);
router.get(
  "/getPropertyTypeById/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getPropertyTypeById
);
router.put(
  "/updatePropertyType/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.updatePropertyType
);
router.delete(
  "/deletePropertyType/:id",
  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.deletePropertyType
);
router.post("/boostProperty",  auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),propertyController.boostProperty)


module.exports = router;
