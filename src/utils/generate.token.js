const jwt = require("jsonwebtoken");
const UserToken = require("../models/token.model");
require("dotenv").config();

const generateTokens = async (email, userId, isAdmin, isAgent, isSeller, isBuyer) => {
  try {
    if (!email || !userId) {
      throw new Error("Email and userId are required to generate tokens");
    }

    const accessTokenExpiry = parseInt(process.env.ACCESS_TOKEN_EXPIRY);  
    const refreshTokenExpiry = parseInt(process.env.REFRESH_TOKEN_EXPIRY);

    const payload = { email, id: userId, isAdmin, isAgent, isSeller, isBuyer };

    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_PRIVATE_KEY, { expiresIn: accessTokenExpiry });
    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_PRIVATE_KEY, { expiresIn: refreshTokenExpiry });

    await UserToken.create({
      userId,
      refreshToken,
      accessToken,
      accessTokenExpiry,
      refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
    };
  } catch (error) {
    throw new Error(`Failed to generate tokens: ${error.message}`);
  }
};

module.exports = { generateTokens };
