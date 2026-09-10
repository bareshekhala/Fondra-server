//  Organize and connect all the routes
const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middlewares/auth.middlewares.js")

//Routes
const authRouter = require("./auth.routes.js")
router.use("/auth", authRouter)

const checkinRouter = require("./checkIn.routes.js")
router.use("/checkins",checkinRouter)

module.exports = router