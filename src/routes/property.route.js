const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");

router.post(
  "/createProperty",
   auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  upload.fields([
    { name: "mainPhoto", maxCount: 1 },
    { name: "sliderPhotos", maxCount: 10 },
  ]),
  propertyController.createProperty
);

router.get(
  "/getAllProperties",
   auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getAllProperties
);

router.get(
  "/getPropertyById/:id",
   auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getPropertyById
);

router.put(
  "/updateProperty/:id",
  upload.single("mainPhoto"),
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
  "/removeSliderImages",
   auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.removeSliderImages
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

router.get("/analyticDashboard", auth(["isAdmin"]), propertyController.analyticDashboard);
router.get(
  "/getPropertyByAgentId/:id",
   auth(["isSeller", "isAdmin", "isBuyer", "isAgent"]),
  propertyController.getPropertyByAgentId
);

module.exports = router;
