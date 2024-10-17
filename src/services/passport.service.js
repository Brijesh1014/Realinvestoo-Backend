const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User_Model = require("../models/user.model");
const dotenv = require("dotenv");
const { generateTokens } = require("../utils/generate.token");
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const { email, sub: googleId } = profile._json;

      try {
        const user = await User_Model.findOne({ email });

        if (!user) {
          return done(null, false, {
            message: "User not found. Please register.",
          });
        }

        const tokens = await generateTokens(email, user._id);
        user.tokens = tokens;

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});
