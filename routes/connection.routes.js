const express = require("express");
const router = express.Router();

const Connection = require("../models/Connection.model.js");
const User = require("../models/User.model.js");
const verifyToken = require("../middlewares/auth.middlewares");

// GET -> /api/connections/search...
router.get("/search", verifyToken, async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();

    if (q.length < 2) {
      return res.status(200).json({ results: [] });
    }

    const results = await User.find({
      _id: { $ne: req.payload._id }, 
      $or: [{ username: { $regex: q } }, { email: q }],
    })
      .select("username name avatar")
      .limit(10);

    res.status(200).json({ results });
  } catch (error) {
    next(error);
  }
});

//Post -> /api/connections/request/:userId
router.post("/request/:userId", verifyToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === String(req.payload._id)) {
      return res.status(400).json({
        message: "You're already in your own circle",
      });
    }
    const result = await User.findById(userId);
    if (!result) {
      return res.sendStatus(204);
    }

    //already have a connection?
    const already = await Connection.findOne({
      $or: [
        { requester: req.payload._id, recipient: userId },
        { requester: userId, recipient: req.payload._id },
      ],
    });
    if (already) {
      return res
        .status(409)
        .json({ message: "You already have a connection/request with them" });
    }
    const connection = await Connection.create({
      requester: req.payload._id,
      recipient: userId,
    });

    await connection.populate("recipient", "username name avatar status");

    res.status(201).json({
      message: `Request sent to ${connection.recipient.name}`,
      connection,
    });
  } catch (error) {
    next(error);
  }
});

//Get -> /api/connections/requests
// the requests that user needs to answer
router.get("/requests", verifyToken, async (req, res, next) => {
  try {
    const requests = await Connection.find({
      recipient: req.payload._id,
      status: "pending",
    }).populate("requester", "username name avatar status");

    res.status(200).json({ requests });
  } catch (error) {
    next(error);
  }
});

//Put -> /api/connections/:connectionId/accept
router.put("/:connectionId/accept", verifyToken, async (req, res, next) => {
  try {
    const connection = await Connection.findOneAndUpdate(
      {
        _id: req.params.connectionId,
        recipient: req.payload._id,
        status: "pending",
      },
      { status: "accepted" },
      { returnDocument: "after" },
    );

    if (!connection) {
      return res.sendStatus(204);
    }

    res.status(200).json({ message: "Added to your circle", connection });
  } catch (error) {
    next(error);
  }
});

//Get -> /api/connections
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const circle = await Connection.find({
      status: "accepted",
      $or: [{ requester: req.payload._id }, { recipient: req.payload._id }],
    }).populate({
      path: "requester recipient",
      select: "username name avatar lastCheckIn checkIn status statusNote",
      populate: {
        path: "checkIn",
        select: "mood note social createdAt",
      },
    });

    const myCircle = circle.map((c) =>
      String(c.requester._id) === String(req.payload._id)
        ? c.recipient
        : c.requester,
    );

    res.status(200).json({ myCircle });
  } catch (error) {
    next(error);
  }
});

//Delete -> // /api/connections/:userId
router.delete("/:userId", verifyToken, async (req, res, next) => {
  try {
    const remove = await Connection.findOneAndDelete({
      $or: [
        { requester: req.payload._id, recipient: req.params.userId },
        { requester: req.params.userId, recipient: req.payload._id },
      ],
    });

    if (!remove) {
      return res.sendStatus(204);
    }

    res.status(200).json({
      message:
        remove.status === "pending"
          ? "Request withdrawn"
          : "Removed from your circle",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
