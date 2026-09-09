//  Organize and connect all the routes
const express = require("express")
const router = express.Router()
const { verifyToken, verifyAdmin } = require("../middlewares/auth.middlewares.js")

//Routes
const userRouter = require("./user.routes.js")

module.exports = router