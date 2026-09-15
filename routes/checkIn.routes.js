const express = require("express");
const router = express.Router();

const CheckIn = require("../models/CheckIn.model.js");
const User = require("../models/User.model.js");
const verifyToken = require("../middlewares/auth.middlewares");

// GET -> /api/checkins/today
const maxCheckins = 5;
const socialType = CheckIn.schema.path("social").enumValues;
const moodType = CheckIn.schema.path("mood").enumValues;


router.get("/today", verifyToken, async (req, res, next) => {
  try {
    const { localDate } = req.query;

    //required
    if (!localDate) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    const count = await CheckIn.countDocuments({
      user: req.payload._id,
      localDate,
    });

    const last = await CheckIn.findOne({
      user: req.payload._id,
      localDate,
    })
      .sort({ createdAt: -1 })
      .select("mood note social createdAt");

    res.status(200).json({
      count,
      limit: maxCheckins,
      last,
    });
  } catch (error) {
    next(error);
  }
});

// POST -> /api/checkins
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { localDate, mood = "Busy but okay", note = "", social = "" } = req.body;

    //required
    if (!localDate) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    //check mood
    if (!moodType.includes(mood)) {
      return res.status(400).json({
        message: "Pick one of the available moods",
      });
    }

    //check social
    if (social && !socialType.includes(social)) {
      return res.status(400).json({
        message: "Pick one of the available social levels",
      });
    }

    // number of check ins
    const todayCheckIns = await CheckIn.countDocuments({
      user: req.payload._id,
      localDate,
    });
    if (todayCheckIns >= maxCheckins) {
      return res.status(409).json({
        message: `You can check in up to ${maxCheckins} times a day`,
      });
    }

    const checkIn = await CheckIn.create({
      user: req.payload._id,
      localDate,
      mood,
      note: note.slice(0, 140),
      social,
    });

    await User.findByIdAndUpdate(req.payload._id, {
      lastCheckIn: new Date(),
      checkIn: checkIn._id,
    });

    res.status(201).json({
      message: "Check-in created successfully",
    });
  } catch (error) {
    next(error);
  }
});

// PATCH -> /api/checkins/:checkInId
router.patch("/:checkInId", verifyToken, async (req, res, next) => {
  try {
    const { checkInId } = req.params;
    const { note, social } = req.body;

    const checkIn = await CheckIn.findOneAndUpdate(
      { _id: checkInId, user: req.payload._id },
      { note, social },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!checkIn) {
      return res.status(404).json({
        message: "Check-in not found",
      });
    }

    res.status(200).json({ message: "Check-in updated" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
