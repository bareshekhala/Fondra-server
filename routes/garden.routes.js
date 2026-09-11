const express = require("express");
const router = express.Router();

const GardenItem = require("../models/GardenItem.model.js");
const verifyToken = require("../middlewares/auth.middlewares");
const Poke = require("../models/Poke.model.js");

const types = ["daisy", "tulip", "sunflower", "lavender", "fern"];

// GET
// /api/garden
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const garden = await GardenItem.find({
      user: req.payload._id,
    })
      .sort({ createdAt: -1 })
      .populate("fromUser", "name username avatar");

    res.status(200).json({
      garden,
    });
  } catch (error) {
    next(error);
  }
});

//POST
// /api/garden/plant/:pokeId
router.post("/plant/:pokeId", verifyToken, async (req, res, next) => {
  try {
    const { pokeId } = req.params;
    const { x, y } = req.body;

    const poke = await Poke.findOne({
      _id: pokeId,
      to: req.payload._id,
      kind: "poke",
      plantedAt: null,
    });

    if (!poke) {
      return res.status(404).json({
        message: "Poke not found or already planted",
      });
    }
   

    const species = types[Math.floor(Math.random() * types.length)];

    const gardenItem = await GardenItem.create({
      user: req.payload._id,
      fromUser: poke.from,
      species,
      x: typeof x === "number" ? x : Math.random() * 0.8 + 0.1,
      y: typeof y === "number" ? y : Math.random() * 0.3 + 0.6,
    });

    poke.plantedAt = new Date();
    await poke.save();

    res.status(201).json({ gardenItem });
  } catch (error) {
    next(error);
  }
});

// PUT
// /api/garden/:gardenItemId
router.put("/:gardenItemId", verifyToken, async (req, res, next) => {
  try {
    const { gardenItemId } = req.params;
    const { x, y } = req.body;

    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      x < 0 || x > 1 || y < 0 || y > 1
    ) {
      return res.status(400).json({ message: "That position is off the plot" });
    }
    const gardenItem = await GardenItem.findOneAndUpdate(
      { _id: gardenItemId, user: req.payload._id },
      { x, y },
      { new: true },
    );

    if (!gardenItem) {
      return res.status(404).json({ message: "Garden item not found" });
    }

    res.status(200).json({ gardenItem });
  } catch (error) {
    next(error);
  }
});



// DELETE
// /api/garden/:gardenItemId
router.delete("/:gardenItemId", verifyToken, async (req, res, next) => {
  try {
    const { gardenItemId } = req.params;

    const gardenItem = await GardenItem.findOne({
      _id: gardenItemId,
      user: req.payload._id,
    });

    if (!gardenItem) {
      return res.status(404).json({
        message: "Garden item not found",
      });
    }

    await GardenItem.findByIdAndDelete(gardenItemId);

    res.status(200).json({
      message: "Flower removed from your garden",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
