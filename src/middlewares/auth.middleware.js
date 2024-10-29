const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const UserToken = require("../models/token.model");

const auth =
  (requiredRoles = [], isPublic = false) =>
  async (req, res, next) => {
    try {
      let token = req.headers.authorization;
      if (!token) {
        return res
          .status(401)
          .json({ message: "Unauthorized user", success: false });
      }

      let decoded;
      if (isPublic) {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_PUBLIC_KEY);
      } else {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_PRIVATE_KEY);
      }

      const user = await UserModel.findOne({ _id: decoded.id });
      const userToken = await UserToken.findOne({
        $and: [{ userId: decoded.id }, { accessToken: token }],
      });

      if (!user || !userToken) {
        return res
          .status(401)
          .json({ message: "Authentication failed", success: false });
      }

      if (requiredRoles.length > 0) {
        const hasRole = requiredRoles.some((role) => user[role]);
        if (!hasRole) {
          return res.status(403).json({
            message: "Forbidden: Insufficient permissions",
            success: false,
          });
        }
      }

      req.userId = decoded.id;
      req.userEmail = decoded.email;
      req.isAdmin = decoded.isAdmin;
      req.isAgent = decoded.isAgent;
      req.isEmp = decoded.isEmp;
      req.isUser = decoded.isUser;

      next();
    } catch (err) {
      return res
        .status(401)
        .json({ message: err.message || "Unauthorized user", success: false });
    }
  };

module.exports = auth;
