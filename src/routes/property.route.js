const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.post(
  "/createProperty",
  auth(["isEmp", "isAdmin", "isUser"]),
  upload.fields([
    { name: "mainPhoto", maxCount: 1 },
    { name: "sliderPhotos", maxCount: 10 },
  ]),
  propertyController.createProperty
);

router.get(
  "/getAllProperties",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.getAllProperties
);

router.get(
  "/getPropertyById/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.getPropertyById
);

router.put(
  "/updateProperty/:id",
  upload.single("mainPhoto"),
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.updateProperty
);

router.put(
  "/uploadNewSliderImages/:id",
  upload.fields([{ name: "sliderPhotos", maxCount: 10 }]),
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.uploadNewSliderPhoto
);

router.post(
  "/removeSliderImages",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.removeSliderImages
);

router.delete(
  "/deleteProperty/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.deleteProperty
);

router.post(
  "/addReview/:propertyId",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.addReview
);

router.post(
  "/createAppointment",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.createAppointment
);

router.get(
  "/getAllAppointments",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.getAllAppointments
);

router.get(
  "/getAppointmentById/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.getAppointmentById
);

router.get(
  "/getUserAppointments",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.getUserAppointments
);

router.put(
  "/updateAppointment/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.updateAppointment
);

router.delete(
  "/deleteAppointment/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.deleteAppointment
);

router.get("/analyticDashboard", propertyController.analyticDashboard);
router.get(
  "/getPropertyByAgentId/:id",
  auth(["isEmp", "isAdmin", "isUser"]),
  propertyController.getPropertyByAgentId
);

module.exports = router;
