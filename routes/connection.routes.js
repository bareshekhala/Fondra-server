const express = require("express");
const router = express.Router();

const Connection = require("../models/Connection.model.js");
const User = require("../models/User.model.js");
const verifyToken = require("../middlewares/auth.middlewares");

//searching for connections -> /api/connections/search?q=
router.get("/search", verifyToken, async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    if (q.length < 2) {
      return res.status(200).json({ results: [] });
    }

    //our current connections can be hidden in the serarch...
    // I will add this part later....

    //now just our profile is hidden in the search
    const results = await User.find({
      _id: { $ne: req.payload._id },
      $or: [{ username: { $regex: q, $options: "i" } }, { email: q }],
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
    // check if the user is exist or not
    const result = await User.findById(userId);
    if (!result) {
      return res.status(204).json(result);
    }

    //check if we already have a connection
    const already = await Connection.findOne({
      $or: [
        { requester: req.payload._id, recipient: userId },
        { requester: userId, recipient: req.payload._id },
      ],
    });
    if (already) {
      return res.status(409).json({ message: "You already have a connection/request with them" });
    }
    const connection = await Connection.create({
      requester: req.payload._id,
      recipient: userId,
    });

    res.status(201).json({
      message: `Request sent to ${result.name}`,
      connection,
      recipient: {
        id: result._id,
        name: result.name,
        username: result.username,
        avatar: result.avatar,
        status: result.status,
      },
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
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      recipient: req.payload._id,
      status: "pending",
    });

    if (!connection) {
      return res.status(204).json(connection);
    }
    // the user accept it and then we update the connection status from pending to accepted
    connection.status = "accepted";
    await connection.save();

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
    }).populate(
      "requester recipient",
      "username name avatar lastCheckIn status statusNote",
    );

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
      return res.status(204).json({ message: "They're not in your circle" });
    }

    res.status(200).json({ message:remove.status === "pending" ? "Request withdrawn" : "Removed from your circle",
      });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
