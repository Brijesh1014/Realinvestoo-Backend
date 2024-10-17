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
const chatRoute = require("./src/routes/chat.route");
const messageRoute = require("./src/routes/message.route");
const couponRoute = require("./src/routes/coupon.route");
const initSocketIo = require("./src/services/socket.service");

app.set("view engine", "ejs");
const viewsDir = path.join(__dirname, "../src/views");
app.set("views", viewsDir);

const staticDir = path.join(__dirname, "public");
app.use(express.static(staticDir));
app.use(express.json());

app.use(cors({ origin: "*" }));
app.use(express.urlencoded({ extended: true }));

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
app.use("/chat", chatRoute);
app.use("/message", messageRoute);
app.use("/coupon", couponRoute);
const server = app.listen(PORT, () => {
  console.log(`Server up and running on port ${PORT}!`);
});

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "*",
    credentials: true,
  },
});

initSocketIo(io);
