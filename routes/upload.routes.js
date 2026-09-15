const express = require("express");
const router = express.Router();

const User = require("../models/User.model.js");
const verifyToken = require("../middlewares/auth.middlewares");
const {fileUploader: uploader, destroyAvatar} = require("../middlewares/cloudinary.config.js");


// when the avatar is shown, it is also in the cloudinary => when we want to delete a photo in addition to our server we should remove it from Cloudinary also
// also when the user wants to upload a new photo we first should delete the old one and then post the new one :)

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

      const previous = await User.findById(req.payload._id)
      .select("avatarId");

      const user = await User.findByIdAndUpdate(
        req.payload._id,
        { avatar: req.file.path, avatarId: req.file.filename },
        { returnDocument: "after" },
      );
      await destroyAvatar(previous.avatarId);

      res.status(200).json({ user: user.toPublic() });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE -> /api/upload/avatar
router.delete("/avatar", verifyToken, async (req, res, next) => {
  try {
    const previous = await User.findById(req.payload._id)
    .select("avatarId");

    const user = await User.findByIdAndUpdate(
      req.payload._id,
      { avatar: "", avatarId: "" },
      { returnDocument: "after" },
    );

    await destroyAvatar(previous.avatarId);

    res.status(200).json({ user: user.toPublic() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;