const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const UserToken = require("../models/token.model");
require("dotenv").config();

const auth = (requiredRoles = [], isPublic = false) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization;

      if (!token) {
        return res.status(401).json({
          message: "Unauthorized: No token provided",
          success: false,
        });
      }

      const secretKey = isPublic
        ? process.env.ACCESS_TOKEN_PUBLIC_KEY
        : process.env.ACCESS_TOKEN_PRIVATE_KEY;

      let decoded;
      try {
        decoded = jwt.verify(token, secretKey);
      } catch (err) {
        return res.status(401).json({
          message: "Invalid or expired token",
          success: false,
        });
      }

      const [user, userToken] = await Promise.all([
        UserModel.findById(decoded.id),
        UserToken.findOne({
          userId: decoded.id,
          accessToken: token,
        }),
      ]);

      if (!user || !userToken) {
        return res.status(401).json({
          message: "Authentication failed",
          success: false,
        });
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
      req.isSeller = decoded.isSeller;
      req.isBuyer = decoded.isBuyer;

      next();
    } catch (err) {
      console.error("Auth Middleware Error:", err);
      return res.status(500).json({
        message: "Internal Server Error",
        success: false,
      });
    }
  };
};

module.exports = auth;
