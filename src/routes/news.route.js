const express = require("express");
const router = express.Router();
const newsController = require("../controllers/news.controller");
const auth = require("../middlewares/auth.middleware");

router.post(
  "/createCategory",
  auth(["isAdmin"]),
  newsController.createCategory
);
router.get("/getAllCategories", newsController.getAllCategories);
router.get("/getCategoryById/:id", newsController.getCategoryById);
router.put(
  "/updateCategory/:id",
  auth(["isAdmin"]),
  newsController.updateCategory
);
router.delete(
  "/deleteCategory/:id",
  auth(["isAdmin"]),
  newsController.deleteCategory
);

router.post("/createNews", auth(["isAdmin"]), newsController.createNews);
router.get("/getAllNews", newsController.getAllNews);
router.get("/getNewsById/:id", newsController.getNewsById);
router.put(
  "/updateNews/:id",
  auth(["isEmp", "isAdmin"]),
  newsController.updateNews
);
router.delete("/deleteNews/:id", auth(["isAdmin"]), newsController.deleteNews);

module.exports = router;