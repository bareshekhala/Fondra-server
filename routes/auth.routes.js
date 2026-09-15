const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const User = require("../models/User.model.js");
const Connection = require("../models/Connection.model.js");

const verifyToken = require("../middlewares/auth.middlewares");

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

    const user = await User.create({
      username,
      email,
      name,
      passwordHash,
    });

    // If the user joined through an invitation
    if (inviteCode) {
      const sender = await User.findOne({ inviteCode });

      //to make sure the user did not invite herself :)
      if (sender && String(sender._id) !== String(user._id)) {
        // Create the Connection between them
        await Connection.create({
          requester: sender._id,
          recipient: user._id,
          status: "accepted",
        });
      }
    }

    res.sendStatus(201);
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

    //getting the IP of the user
    const response = await axios.get("https://ipapi.co/json/");
    const location = response.data;

    await User.findByIdAndUpdate(foundUser._id, {
      location: {
        city: location.city,
        country: location.country_name,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });

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

module.exports = router;
