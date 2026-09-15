// config/cloudinary.config.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "fondra-avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],

    transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
  },
});


const fileUploader = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
});

const destroyAvatar = async (avatarId) => {
  if (!avatarId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(avatarId);
  } catch (error) {
    console.log("Could not remove the old avatar from Cloudinary:", error);
  }
};

module.exports = { fileUploader, cloudinary, destroyAvatar };