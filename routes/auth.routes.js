const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");

const User = require("../models/User.model.js");
const Connection = require("../models/Connection.model.js");

const verifyToken = require("../middlewares/auth.middlewares");

// GET "/api/invite/:code"
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

// POST "/api/auth/signup"
// Create a new user
router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password, name, inviteCode } = req.body;

    // Mandatory fields
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        message: "Fill in every field to continue",
      });
    }

    // Password strength
    const passwordRegex =
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        errorMessage:
          "Password not strong enough. Needs at least 8 characters, one uppercase, one lowercase and one number",
        field: "password",
      });
    }

    // Check if email already exists
    const foundUser = await User.findOne({ email });

    if (foundUser) {
      return res.status(400).json({
        errorMessage: "User already exists with this email",
      });
    }

    // Create the new user
    const user = new User({
      username,
      email,
      name,
    });

    // Hash the password
    await user.setPassword(password);

    // Save user in database
    await user.save();

    // If the user joined through an invitation
    if (inviteCode) {
      const sender = await User.findOne({ inviteCode });

      // Make sure the user did not invite herself
      if (sender && String(sender._id) !== String(user._id)) {
        // Create the connection
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

// POST "/api/auth/login"
// Validate credentials and create JWT
router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // Both fields are required
    if (!identifier || !password) {
      return res.status(400).json({
        message: "Enter your details to sign in",
      });
    }

    // Search by email OR username
    const foundUser = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    });

    if (!foundUser) {
      return res.status(400).json({
        errorMessage: "User not found",
      });
    }

    // Check password
    const passwordCorrect = await foundUser.checkPassword(password);

    if (!passwordCorrect) {
      return res.status(400).json({
        errorMessage: "Invalid password",
      });
    }

    // JWT payload
    const payload = {
      _id: foundUser._id,
      email: foundUser.email,
      username: foundUser.username,
    };

    // Create JWT
    const authToken = jwt.sign(
      payload,
      process.env.TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      authToken,
      payload,
    });
  } catch (error) {
    next(error);
  }
});

// GET "/api/auth/verify"
// Verify the JWT
router.get("/verify", verifyToken, (req, res) => {
  res.status(200).json({
    payload: req.payload,
  });
});

module.exports = router;