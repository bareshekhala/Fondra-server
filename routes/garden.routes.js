const express = require("express");
const router = express.Router();

const GardenItem = require("../models/GardenItem.model.js");
const verifyToken = require("../middlewares/auth.middlewares");
const Poke = require("../models/Poke.model.js");

// GET -> /api/garden
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

const plotCapacity = 15;

//POST -> /api/garden/plant/:pokeId
router.post("/plant/:pokeId", verifyToken, async (req, res, next) => {
  try {
    const { pokeId } = req.params;
    const { x, y, picked = false } = req.body;

    const poke = await Poke.findOne({
      _id: pokeId,
      to: req.payload._id,
      kind: "gift", // only a poke back becomes a flower
      plantedAt: null,
    });

    if (!poke) {
      return res.status(404).json({
        message: "Poke not found or already planted",
      });
    }

    // the flower was already chosen when the poke was answered
    if (!poke.species) {
      return res.status(400).json({
        message: "This poke has no flower to plant",
      });
    }

    const planted = await GardenItem.find({
      user: req.payload._id,
      picked: true,
    }).select("x y");

    if (picked && planted.length >= plotCapacity) {
      return res
        .status(400)
        .json({
          message:
            "Your garden is full. Unpick one first to make room for a new one. ",
        });
    }

    // with this way we do not let the flowers in the garden to be lost in each other :) we wanna make sure that each flower has a reasonable space
    const ASPECT = 9 / 16;

    const spotFor = (taken) => {
      let best = null;

      for (let i = 0; i < 20; i += 1) {
        const spot = {
          x: Math.random() * 0.8 + 0.1,
          y: Math.random() * 0.32 + 0.6,
        };

        const room = taken.reduce((closest, other) => {
          const dx = spot.x - other.x;
          const dy = (spot.y - other.y) * ASPECT;
          return Math.min(closest, Math.sqrt(dx * dx + dy * dy));
        }, Infinity);

        if (!best || room > best.room) {
          best = { ...spot, room };
        }
      }

      return best;
    };

    const spot = spotFor(planted);

    const gardenItem = await GardenItem.create({
      user: req.payload._id,
      poke: poke._id,
      fromUser: poke.from,
      species: poke.species,
      picked: Boolean(picked),
      x: typeof x === "number" ? x : spot.x,
      y: typeof y === "number" ? y : spot.y,
    });

    await Poke.findByIdAndUpdate(poke._id, { plantedAt: new Date() });

    res.status(201).json({ gardenItem });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "This flower is already planted" });
    }

    next(error);
  }
});

// PUT -> /api/garden/:gardenItemId/picked
router.put("/:gardenItemId/picked", verifyToken, async (req, res, next) => {
  try {
    const { picked } = req.body;

    if (typeof picked !== "boolean") {
      return res.status(400).json({ message: "Picked must be true or false" });
    }

    // picking one more flower is only allowed while the plot still has room -> so we need to count first
    if (picked) {
      const inGarden = await GardenItem.countDocuments({
        user: req.payload._id,
        picked: true,
        _id: { $ne: req.params.gardenItemId },
      });

      if (inGarden >= plotCapacity) {
        return res
          .status(400)
          .json({
            message:
              "Your garden is full. Unpick one first to make room for a new one.",
          });
      }
    }

    const gardenItem = await GardenItem.findOneAndUpdate(
      { _id: req.params.gardenItemId, user: req.payload._id },
      { picked },
      { returnDocument: "after" },
    );

    if (!gardenItem) {
      return res.status(404).json({ message: "Garden item not found" });
    }

    res.status(200).json({ gardenItem });
  } catch (error) {
    next(error);
  }
});

// PUT -> /api/garden/:gardenItemId
router.put("/:gardenItemId", verifyToken, async (req, res, next) => {
  try {
    const { gardenItemId } = req.params;
    const { x, y } = req.body;

    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      x < 0 ||
      x > 1 ||
      y < 0 ||
      y > 1
    ) {
      return res.status(400).json({ message: "That position is off the plot" });
    }
    const gardenItem = await GardenItem.findOneAndUpdate(
      { _id: gardenItemId, user: req.payload._id },
      { x, y },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!gardenItem) {
      return res.status(404).json({ message: "Garden item not found" });
    }

    res.status(200).json({ gardenItem });
  } catch (error) {
    next(error);
  }
});

// DELETE -> /api/garden/:gardenItemId
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
