const express = require("express");
const router = express.Router();

const User = require("../models/User.model.js");
const CheckIn = require("../models/CheckIn.model.js");
const Poke = require("../models/Poke.model.js");
const GardenItem = require("../models/GardenItem.model.js");
const Connection = require("../models/Connection.model.js");
const verifyToken = require("../middlewares/auth.middlewares");
const { destroyAvatar } = require("../middlewares/cloudinary.config.js");

// GET -> /api/users/me
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.payload._id);

    if (!user) {
      return res.status(404).json({ message: "That account no longer exists" });
    }

    res.status(200).json({ user: user.toPublic() });
  } catch (error) {
    next(error);
  }
});

// DELETE -> /api/users/delete-account
// delete account => so with this when a user deletes her account we delete all her information
router.delete("/delete-account", verifyToken, async (req, res, next) => {
  try {
    const userId = req.payload._id;

    await CheckIn.deleteMany({ user: userId });
    await GardenItem.deleteMany({ user: userId });
    await Poke.deleteMany({ $or: [{ from: userId }, { to: userId }] });
    await Connection.deleteMany({
      $or: [{ requester: userId }, { recipient: userId }],
    });

    const deleted = await User.findByIdAndDelete(userId);

    if (deleted) {
      await destroyAvatar(deleted.avatarId);
    }

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
