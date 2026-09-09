// middleware for handling roles

function verifyAdmin(req, res, next) {
  if (req.payload.role === "admin") {
    next();
  } else {
    res.status(403).json({
      errorMessage: "This route is only for admins",
    });
  }
}

module.exports = verifyAdmin;