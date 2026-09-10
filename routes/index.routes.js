//  Organize and connect all the routes
const express = require("express")
const router = express.Router()
const { verifyToken } = require("../middlewares/auth.middlewares.js")

//Routes
const authRouter = require("./auth.routes.js")
router.use("/auth", authRouter)


module.exports = router