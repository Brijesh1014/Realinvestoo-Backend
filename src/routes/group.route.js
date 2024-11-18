const express = require("express");
const router = express.Router();
const groupController = require("../controllers/group.controller");
const auth = require("../middlewares/auth.middleware");

router.post(
  "/create",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  groupController.createGroup
);
router.post(
  "/addMember/:groupId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  groupController.addMember
);
router.post(
  "/removeMember/:groupId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  groupController.removeMember
);
router.post(
  "/promoteMember/:groupId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  groupController.promoteMember
);
router.put(
  "/updateGroup/:groupId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  groupController.updateGroupDetails
);
router.delete(
  "/deleteGroup/:groupId",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  groupController.deleteGroup
);
router.get(
  "/getAllGroups",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  groupController.getAllGroups
);
router.get(
  "/getGroupsByUser",
  auth(["isEmp", "isAdmin", "isProuser", "isAgent", "isUser"]),
  groupController.getGroupsByUser
);

module.exports = router;
