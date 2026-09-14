const express = require("express");
const router = express.Router();

const Poke = require("../models/Poke.model.js");
const Connection = require("../models/Connection.model.js");
const verifyToken = require("../middlewares/auth.middlewares");

//Post -> /api/pokes/:userId
router.post("/:userId", verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { localDate } = req.body; 

    if (!localDate) {
      return res.status(400).json({
        message: "Date is required",
      });
    }
    
    //users are connected?
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

// GET -> /api/pokes/unplanted
router.get("/unplanted", verifyToken, async (req, res, next) => {
  try {
    const pokes = await Poke.find({
      to: req.payload._id,
      plantedAt: null,
    })
      .sort({ createdAt: -1 })
      .populate("from", "name username avatar");

    res.status(200).json({ pokes });
  } catch (error) {
    next(error);
  }
});

// DELETE -> /api/pokes/:pokeId
router.delete("/:pokeId", verifyToken, async (req, res, next) => {
  try {
    const { pokeId } = req.params;

    const poke = await Poke.findOneAndDelete({
      _id: pokeId,
      to: req.payload._id,
      plantedAt: null,
    });

    if (!poke) {
      return res.status(404).json({
        message: "Poke not found or already planted",
      });
    }

    res.status(200).json({ message: "Flower thrown away" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
