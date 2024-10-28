const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.post(
  "/createProperty",
  auth(["isEmp", "isAdmin"]),
  upload.fields([
    { name: "mainPhoto", maxCount: 1 },
    { name: "sliderPhotos", maxCount: 10 },
  ]),
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
  upload.single("mainPhoto"),
  auth(["isEmp", "isAdmin"]),
  propertyController.updateProperty
);

router.put(
  "/uploadNewSliderImages/:id",
  upload.fields([{ name: "sliderPhotos", maxCount: 10 }]),
  auth(["isEmp", "isAdmin"]),
  propertyController.uploadNewSliderPhoto
);

router.post(
  "/removeSliderImages",
  auth(["isEmp", "isAdmin"]),
  propertyController.removeSliderImages
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

router.get(
  "/getAppointmentById/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.getAppointmentById
);

router.get(
  "/getUserAppointments",
  auth(["isEmp", "isAdmin"]),
  propertyController.getUserAppointments
);

router.put(
  "/updateAppointment/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.updateAppointment
);

router.delete(
  "/deleteAppointment/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.deleteAppointment
);

router.get("/analyticDashboard", propertyController.analyticDashboard);
router.get(
  "/getPropertyByAgentId/:id",
  auth(["isEmp", "isAdmin"]),
  propertyController.getPropertyByAgentId
);

module.exports = router;
