const User_Model = require("../models/user.model");
const Token_Model = require("../models/token.model");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const generateTokens = require("../utils/generate.token");
const dotenv = require("dotenv");
const { sendEmail } = require("../utils/email.utils");
const jwt = require("jsonwebtoken");
dotenv.config();

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNo,
      username,
      password,
      country,
      state,
      city,
      zipCode,
      reasonForJoining,
      isAdmin,
      isAgent,
      isProuser,
      isEmp,
    } = req.body;

    const existingUser = await User_Model.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with that email" });
    }

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Please enter all required fields" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User_Model({
      name,
      email,
      phoneNo,
      username,
      password: hashedPassword,
      country,
      state,
      city,
      zipCode,
      reasonForJoining,
      isAdmin,
      isAgent,
      isProuser,
      isEmp,
    });

    await newUser.save();
    res.status(201).json({
      success: true,
      data: newUser,
      message: "User registered successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User_Model.findOne({ email: email });

    if (!user) {
      return res
        .status(400)
        .json({ status: -1, message: "You have to register", success: false });
    }
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res
        .status(400)
        .json({ success: false, message: "Password Does Not Match" });
    }
    const { accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry } =
      await generateTokens.generateTokens(
        email,
        user._id,
        user?.isAdmin,
        user?.isAgent,
        user?.isEmp
      );
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: user,
      accessToken,
      accessTokenExpiry,
      refreshToken,
      refreshTokenExpiry,
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token is required." });
    }
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_PRIVATE_KEY,
      async (err, user) => {
        if (err) {
          return res
            .status(403)
            .json({ success: false, message: "Invalid refresh token." });
        }

        const userToken = await Token_Model.findOne({
          userId: user.id,
          refreshToken,
        });
        if (!userToken) {
          return res
            .status(403)
            .json({ success: false, message: "Refresh token not found." });
        }

        const newAccessToken = jwt.sign(
          {
            id: user.id,
            email: user.email,
            isAdmin: user?.isAdmin,
            isAgent: user?.isAgent,
            isEmp: user?.isEmp,
          },
          process.env.ACCESS_TOKEN_PRIVATE_KEY,
          { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
        );
        if (!newAccessToken) {
          return res.status(400).json({
            success: false,
            message: "Something went wrong",
          });
        }
        await Token_Model.findOneAndUpdate(
          { userId: user?.id },
          { accessToken: newAccessToken }
        );

        return res
          .status(200)
          .json({ success: true, accessToken: newAccessToken });
      }
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

const googleLogin = async (req, res) => {
  const { token } = req.body;
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, email } = ticket.getPayload();

    const user = await User_Model.findOne({ email, googleId: sub });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found or not created." });
    }
    const { accessToken, refreshToken, accessTokenExpiry, refreshTokenExpiry } =
      await generateTokens.generateTokens(
        email,
        user._id,
        user?.isAdmin,
        user?.isAgent,
        user?.isEmp
      );
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: user,
      accessToken,
      refreshToken,
      accessTokenExpiry,
      refreshTokenExpiry,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "INVALID_TOKEN", error: error.message });
  }
};
const googleAuth = async (req, res) => {
  const { token } = req.body;
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub, given_name, family_name, email, picture } =
      ticket.getPayload();

    const user = await User_Model.findOneAndUpdate(
      { email, googleId: sub },
      {
        googleToken: token,
        profileImage: picture,
        name: `${given_name} ${family_name}`,
      },
      { upsert: true, new: true }
    );

    if (user) {
      const {
        accessToken,
        refreshToken,
        accessTokenExpiry,
        refreshTokenExpiry,
      } = await generateTokens.generateTokens(
        email,
        user._id,
        user?.isAdmin,
        user?.isAgent,
        user?.isEmp
      );
      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: user,
        accessToken,
        refreshToken,
        accessTokenExpiry,
        refreshTokenExpiry,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "User not found or created." });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "INVALID_TOKEN", error: error.message });
  }
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User_Model.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ message: "User with this email does not exist" });
    }

    const otp = generateOTP();

    user.resetOtp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    const emailText = `Your OTP for password reset is ${otp}. This OTP is valid for 10 minutes.`;

    await sendEmail(email, "Password Reset OTP", emailText);

    return res
      .status(200)
      .json({ success: true, message: "OTP sent to email successfully" });
  } catch (error) {
    console.error("Error in forgetPassword:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User_Model.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.resetOtp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.otpVerified = true;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User_Model.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.otpVerified) {
      return res.status(400).json({
        message:
          "OTP not verified. Please verify the OTP before resetting password",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.otpExpiry = undefined;
    user.otpVerified = undefined;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User_Model.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "User with this email does not exist" });
    }

    const otp = generateOTP();

    user.resetOtp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();

    const emailText = `Your new OTP for password reset is ${otp}. This OTP is valid for 10 minutes.`;

    await sendEmail(email, "Resend OTP for Password Reset", emailText);
    return res
      .status(200)
      .json({ success: true, message: "OTP resend successfully" });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
const changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    const user = await User_Model.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User_Model.findOne({ _id: userId });
    if (!user) {
      return res
        .status(400)
        .json({ status: -1, message: "You have to register", success: false });
    }

    const userToken = await Token_Model.findOneAndUpdate(
      { userId: user._id },
      { accessToken: "", refreshToken: "" }
    );
    if (!userToken) {
      return res.status(400).json({
        message: "Something went wrong",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Logout successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const saveFcmToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;
    console.log("userId: ", userId);

    const updateUserToken = await Token_Model.findOneAndUpdate(
      { userId: userId },
      { fcmToken: fcmToken },
      { upsert: true }
    );
    if (!updateUserToken) {
      return res.status(400).json({
        success: false,
        message: "Something went wrong",
      });
    }
    return res.status(200).json({
      success: true,
      message: "FCM token saved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = {
  register,
  login,
  refreshToken,
  googleLogin,
  forgetPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
  changePassword,
  logout,
  googleAuth,
  saveFcmToken,
};
