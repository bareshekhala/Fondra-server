const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const crypto = require("crypto");
const User = require("../models/User.model.js");
const Connection = require("../models/Connection.model.js");

const verifyToken = require("../middlewares/auth.middlewares");
const { notify } = require("../middlewares/notify.js");
const { sendVerificationCode } = require("../config/mail.js");

// GET -> /api/auth/invite/:code
// Check the invitation link
router.get("/invite/:code", async (req, res, next) => {
  try {
    const sender = await User.findOne({
      inviteCode: req.params.code,
    });

    if (!sender) {
      return res.status(404).json({
        message: "That invite link is no longer valid",
      });
    }

    res.status(200).json({
      sender: {
        name: sender.name,
        username: sender.username,
        avatar: sender.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST -> /api/auth/signup
router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password, name, inviteCode } = req.body;

    if (!username || !email || !password || !name) {
      return res.status(400).json({
        message: "Fill in every field to continue",
      });
    }

    // Password strength
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password not strong enough. Needs at least 8 characters, one uppercase, one lowercase and one number",
      });
    }

    // Check if email or username already existed
    const foundUser = await User.findOne({ $or: [{ email }, { username }] });

    if (foundUser) {
      return res.status(400).json({
        message: "User already exists with this email or username",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");

    const user = await User.create({
      username,
      email,
      name,
      passwordHash,
      emailVerified: false,
      verifyCode: code,
      verifyCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      unverifiedExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      pendingInviteCode: inviteCode || null,
    });

    await sendVerificationCode(user.email, user.name, code);

    res.sendStatus(201);
  } catch (error) {
    next(error);
  }
});

// POST -> /api/auth/verify-email
router.post("/verify-email", async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOneAndUpdate(
      { email, verifyCode: code, verifyCodeExpires: { $gt: new Date() } },
      {
        emailVerified: true,
        verifyCode: null,
        verifyCodeExpires: null,
        unverifiedExpiresAt: null,
      },
      { returnDocument: "after" },
    );

    if (!user) {
      return res.status(400).json({ message: "Wrong or expired code" });
    }

    if (user.pendingInviteCode) {
      const sender = await User.findOne({ inviteCode: user.pendingInviteCode });

      if (sender && String(sender._id) !== String(user._id)) {
        await Connection.create({
          requester: sender._id,
          recipient: user._id,
          status: "accepted",
        });

        await notify(sender._id, {
          actor: user._id,
          type: "accepted",
        });
      }

      await User.findByIdAndUpdate(user._id, { pendingInviteCode: null });
    }

    res.status(200).json({ message: "Your email is verified" });
  } catch (error) {
    next(error);
  }
});

// POST -> /api/auth/resend-code
router.post("/resend-code", async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Enter your email" });
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase(), emailVerified: false },
      {
        verifyCode: code,
        verifyCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
      { returnDocument: "after" },
    );

    if (user) {
      await sendVerificationCode(user.email, user.name, code);
    }

    res.status(200).json({
      message: "If that email is waiting for verification, a new code is on its way",
    });
  } catch (error) {
    next(error);
  }
});

// POST -> /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Enter your details to sign in",
      });
    }

    const foundUser = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    });

    if (!foundUser) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    // Check password
    const passwordCorrect = await foundUser.checkPassword(password);

    if (!passwordCorrect) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    if (!foundUser.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    // JWT payload
    const payload = {
      _id: foundUser._id,
      email: foundUser.email,
      username: foundUser.username,
    };

    // Create JWT
    const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      authToken,
      payload,
    });
  } catch (error) {
    next(error);
  }
});

// GET -> /api/auth/verify
// Verify the JWT
router.get("/verify", verifyToken, (req, res) => {
  res.status(200).json({
    payload: req.payload,
  });
});

// GET -> /api/auth/location
router.get("/location", verifyToken, async (req, res, next) => {
  try {
    let ip = req.ip.replace(/^::ffff:/, "");

    if (ip === "::1" || ip === "127.0.0.1") {
      const ipResponse = await axios.get(
        "https://api.ipify.org?format=json",
        { timeout: 5000 }
      );

      ip = ipResponse.data.ip;
    }

    const response = await axios.get(`https://ipwho.is/${ip}`, {
      timeout: 5000,
    });

    if (
      !response.data.success ||
      response.data.latitude == null ||
      response.data.longitude == null
    ) {
      return res.status(502).json({
        message: "Could not determine your location",
      });
    }

    const location = response.data;

    const user = await User.findByIdAndUpdate(
      req.payload._id,
      {
        location: {
          city: location.city,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
        },
      },
      { returnDocument: "after" },
    );

    if (!user) {
      return res.status(404).json({ message: "That account no longer exists" });
    }

    res.status(200).json({
      location: {
        city: location.city,
        country: location.country,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });
  } catch (error) {
    console.log(error);
    next(error)

    res.status(502).json({
      message: "Location service is temporarily unavailable",
    });
  }
});

module.exports = router;
