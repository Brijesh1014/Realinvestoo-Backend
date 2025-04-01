const express = require("express");
const router = express.Router();
const groupController = require("../controllers/group.controller");
const auth = require("../middlewares/auth.middleware");
const upload = require("../services/multer.service");
router.post(
  "/create",
  upload.single("image"),
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  groupController.createGroup
);
router.post(
  "/addMember/:groupId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  groupController.addMember
);
router.post(
  "/removeMember/:groupId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  groupController.removeMember
);
router.post(
  "/promoteMember/:groupId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  groupController.promoteMember
);
router.put(
  "/updateGroup/:groupId",
  upload.single("image"),
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  groupController.updateGroupDetails
);
router.delete(
  "/deleteGroup/:groupId",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  groupController.deleteGroup
);
router.get(
  "/getAllGroups",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  groupController.getAllGroups
);
router.get(
  "/getGroupsByUser",
  auth(["isBuyer", "isAdmin", "isSeller", "isAgent"]),
  groupController.getGroupsByUser
);

module.exports = router;
