const jwt = require("jsonwebtoken");
const UserToken = require("../models/token.model");

const generateTokens = async (email, userId, isAdmin, isAgent, isEmp) => {
  try {
    const accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY;
    const refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY;
    const payload = {
      email: email,
      id: userId,
      isAdmin: isAdmin,
      isAgent: isAgent,
      isEmp: isEmp,
    };
    const accessToken = jwt.sign(
      payload,
      process.env.ACCESS_TOKEN_PRIVATE_KEY,
      { expiresIn: accessTokenExpiry }
    );
    const refreshToken = jwt.sign(
      payload,
      process.env.REFRESH_TOKEN_PRIVATE_KEY,
      { expiresIn: refreshTokenExpiry }
    );
    let userToken = await UserToken.findOne({ userId: userId });
    if (userToken) await userToken.deleteOne();
    await new UserToken({
      userId: userId,
      refreshToken: refreshToken,
      accessToken: accessToken,
    }).save();
    return Promise.resolve({
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
    });
  } catch (error) {
    return Promise.reject(error);
  }
};
module.exports = { generateTokens };
