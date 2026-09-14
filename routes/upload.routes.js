// routes/upload.routes.js
const express = require("express");
const router = express.Router();

const User = require("../models/User.model.js");
const verifyToken = require("../middlewares/auth.middlewares");
const uploader = require("../middlewares/cloudinary.config.js");

// POST -> /api/upload/avatar
router.post(
  "/avatar",
  verifyToken,
  uploader.single("avatar"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "There was a problem uploading the image. Check image format and size." });
      }

      const user = await User.findByIdAndUpdate(
        req.payload._id,
        { avatar: req.file.path },
        { returnDocument: "after" }, // we send the updated user back
      );

      res.status(200).json({ user: user.toPublic() });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE -> /api/upload/avatar
router.delete("/avatar", verifyToken, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.payload._id,
      { avatar: "" },
      { returnDocument: "after" },
    );

    res.status(200).json({ user: user.toPublic() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;