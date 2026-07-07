const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    let user = await User.findOne({ email: token });

    if (!user) {
      user = new User({
        email: token,
        name: token.split("@")[0] || "User",
        avatar: "",
        role: "user",
        isActive: true,
      });
      await user.save();
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "Account is disabled" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

const adminMiddleware = async (req, res, next) => {
  if (
    req.user.role !== "admin" &&
    req.user.email !== "buihaitrong.dev@gmail.com"
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only!",
    });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware };
