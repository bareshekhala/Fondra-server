//  Organize and connect all the routes
const express = require("express")
const router = express.Router()
//Routes
const authRouter = require("./auth.routes.js")
router.use("/auth", authRouter)

const userRouter = require("./user.routes.js")
router.use("/users", userRouter)

const checkinRouter = require("./checkIn.routes.js")
router.use("/checkins",checkinRouter)

const pokesRouter = require("./poke.routes.js")
router.use("/pokes",pokesRouter)

const gardenRouter = require("./garden.routes.js");
router.use("/garden", gardenRouter);

const connectionRouter = require("./connection.routes.js");
router.use("/connections", connectionRouter);

const uploadRoutes = require("./upload.routes");
router.use("/upload", uploadRoutes);


module.exports = router