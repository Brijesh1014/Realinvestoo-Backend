const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
dotenv.config();
require("./src/config/db.connection");
const app = express();
const PORT = process.env.PORT || 8000;
const authRoute = require("./src/routes/auth.route");
const adminRoute = require("./src/routes/admin.route");
const userRoute = require("./src/routes/user.route");
const propertyRoute = require("./src/routes/property.route");
const newsRoute = require("./src/routes/news.route");
const couponRoute = require("./src/routes/coupon.route");
const favoritesRoute = require("./src/routes/favorites.route");
const faqRoute = require("./src/routes/faq.route");
const contactUsRoute = require("./src/routes/contactUs.route");
const folderRoute = require("./src/routes/folder.route");
const fileRoute = require("./src/routes/file.route");
const likeRoute = require("./src/routes/like.route");
const groupRoutes = require("./src/routes/group.route");
const messageRoutes = require("./src/routes/message.route");
const initSocketIo = require("./src/services/socket.service");

app.set("view engine", "ejs");
const viewsDir = path.join(__dirname, "./src/views");
app.set("views", viewsDir);

const staticDir = path.join(__dirname, "public");
app.use(express.static(staticDir));
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/", async function (req, res) {
  return res.send(
    `Server is running at ${
      req.protocol + "://" + req.hostname + ":" + PORT
    } 🧑🏽‍🚀💻 `
  );
});
app.use("/auth", authRoute);
app.use("/admin", adminRoute);
app.use("/user", userRoute);
app.use("/property", propertyRoute);
app.use("/news", newsRoute);
app.use("/coupon", couponRoute);
app.use("/favorites", favoritesRoute);
app.use("/faq", faqRoute);
app.use("/contactUs", contactUsRoute);
app.use("/file", fileRoute);
app.use("/folder", folderRoute);
app.use("/like", likeRoute);
app.use("/group", groupRoutes);
app.use("/message", messageRoutes);
const server = app.listen(PORT, () => {
  console.log(`Server up and running on port ${PORT}!`);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

initSocketIo(io);
