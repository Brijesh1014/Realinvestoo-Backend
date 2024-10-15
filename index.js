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
app.listen(PORT, () => {
  console.log(`Server up and running on port ${PORT}!`);
});
