const express = require("express");
const router = express.Router();

const Poke = require("../models/Poke.model.js");
const Connection = require("../models/Connection.model.js");
const verifyToken = require("../middlewares/auth.middlewares");

//Post /api/pokes/:userId
router.post("/:userId", verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { localDate } = req.body; //this is needed for counting the pokes in a day

    // check if users are connected
    const connection = await Connection.findOne({
      status: "accepted",
      $or: [
        {
          requester: req.payload._id,
          recipient: userId,
        },
        {
          requester: userId,
          recipient: req.payload._id,
        },
      ],
    });

    if (!connection) {
      return res.status(403).json({
        message: "You can only poke people in your connections",
      });
    }

    // the number pokes that you can send a person is limited to 5
    const todayPokes = await Poke.countDocuments({
      from: req.payload._id,
      to: userId,
      localDate,
    });

    if (todayPokes >= 5) {
      return res.status(409).json({
        message: "You can poke this person up to 5 times a day",
      });
    }


    // create a poke
    const poke = await Poke.create({
      from: req.payload._id,
      to: userId,
      localDate,
    });

    res.status(201).json({
      message: "Poke sent successfully",
      todayPokes,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
