const express = require("express");
const router = express.Router();
const contactUsController = require("../controllers/contactUs.controller");

router.post("/create", contactUsController.createContactUs);
router.get("/getAllContactUs", contactUsController.getAllContactUs);
router.get("/getContactUsById/:id", contactUsController.getContactUsById);
router.delete("/deleteContactUs/:id", contactUsController.deleteContactUs);
router.post("/sendReply", contactUsController.sendReply);
module.exports = router;
