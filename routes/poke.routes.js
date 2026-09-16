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
    const dailyPoke = 5;
    
    //my pokes number
    const todayPokes = await Poke.countDocuments({
      from: req.payload._id,
      to: userId,
      localDate,
    });

    if (todayPokes >= dailyPoke) {
      return res.status(409).json({
        message: `You can poke this person up to ${dailyPoke} times a day`,
      });
    }
    //my connection poke
    const theirPoke = await Poke.findOne({
      from: userId,
      to: req.payload._id,
      kind: "poke",
      answeredAt: null,
    });

    if (!theirPoke) {
      const myPoke = await Poke.findOne({
        from: req.payload._id,
        to: userId,
        kind: "poke",
        answeredAt: null,
      });

      const POKE_COOLDOWN = 60 * 60 * 1000; //1 hour -> ms -> we can poke once in each hour
      if (myPoke && Date.now() - myPoke.createdAt.getTime() < POKE_COOLDOWN) {
        return res.status(409).json({
          message: "You can poke again after one hour",
        });
      }
    }

    const speciesType = Poke.schema.path("species").enumValues;

    const randomSpecies = () =>
      speciesType[Math.floor(Math.random() * speciesType.length)];

    await Poke.create({
      from: req.payload._id,
      to: userId,
      localDate,
      kind: theirPoke ? "gift" : "poke",
      species: theirPoke ? randomSpecies() : null,
    });

    if (theirPoke) {
      await Poke.findByIdAndUpdate(theirPoke._id, { answeredAt: new Date() });
    }

    res.status(201).json({
      message: theirPoke ? "Poked back — they got a flower" : "Poke sent",
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
      kind: "gift",
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
      kind: "gift",
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
