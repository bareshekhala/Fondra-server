const express = require("express");
const router = express.Router();

const Notification = require("../models/Notification.model.js");
const verifyToken = require("../middlewares/auth.middlewares");

// GET -> /api/notifications
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.payload._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("actor", "name username avatar");

    const unread = await Notification.countDocuments({
      user: req.payload._id,
      readAt: null,
    });

    res.status(200).json({ notifications, unread });
  } catch (error) {
    next(error);
  }
});

// PATCH -> /api/notifications/read
router.patch("/read", verifyToken, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.payload._id, readAt: null },
      { readAt: new Date() },
    );

    res.status(200).json({ message: "All caught up" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
