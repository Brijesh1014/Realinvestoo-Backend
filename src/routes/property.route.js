const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.post(
  "/createProperty",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  upload.fields([
    { name: "mainPhoto", maxCount: 1 },
    { name: "sliderPhotos", maxCount: 10 },
  ]),
  propertyController.createProperty
);

router.get(
  "/getAllProperties",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.getAllProperties
);

router.get(
  "/getPropertyById/:id",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.getPropertyById
);

router.put(
  "/updateProperty/:id",
  upload.single("mainPhoto"),
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.updateProperty
);

router.put(
  "/uploadNewSliderImages/:id",
  upload.fields([{ name: "sliderPhotos", maxCount: 10 }]),
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.uploadNewSliderPhoto
);

router.post(
  "/removeSliderImages",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.removeSliderImages
);

router.delete(
  "/deleteProperty/:id",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.deleteProperty
);

router.post(
  "/addReview/:propertyId",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.addReview
);

router.post(
  "/createAppointment",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.createAppointment
);

router.get(
  "/getAllAppointments",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.getAllAppointments
);

router.get(
  "/getAppointmentById/:id",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.getAppointmentById
);

router.get(
  "/getUserAppointments",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.getUserAppointments
);

router.put(
  "/updateAppointment/:id",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.updateAppointment
);

router.delete(
  "/deleteAppointment/:id",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.deleteAppointment
);

router.get("/analyticDashboard", propertyController.analyticDashboard);
router.get(
  "/getPropertyByAgentId/:id",
  auth(["isEmp", "isAdmin", "isUser", "isAgent"]),
  propertyController.getPropertyByAgentId
);

module.exports = router;
