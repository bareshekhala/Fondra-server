const express = require("express");
const router = express.Router();

const CheckIn = require("../models/CheckIn.model.js");
const User = require("../models/User.model.js");
const verifyToken = require("../middlewares/auth.middlewares");

// POST /api/checkins
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const { localDate, mood = "okay", note = "" } = req.body;

    //required
    if (!localDate) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    //check mood
    if (!["good", "okay", "low"].includes(mood)) {
      return res.status(400).json({
        message: "Mood must be good, okay or low",
      });
    }

    // check check-ins
    const todayCheckIns = await CheckIn.countDocuments({
      user: req.payload._id,
      localDate,
    });
    // the number of checked in in a day is limited and it is set to 5 here
    if (todayCheckIns >= 5) {
      return res.status(409).json({
        message: "You can check in up to 5 times a day",
      });
    }

    //create check in object
    const checkIn = await CheckIn.create({
      user: req.payload._id,
      localDate,
      mood,
      note: note.slice(0, 140),
    });

    //update check in
    await User.findByIdAndUpdate(req.payload._id, {
      lastCheckIn: new Date(),
    });

    res.status(201).json({
      message: "Check-in created successfully"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
