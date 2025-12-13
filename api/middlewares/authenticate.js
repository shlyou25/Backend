// middlewares/authenticate.js
const jwt = require("jsonwebtoken");
const userModel = require("../../models/user");

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ 
        status: false, 
        message: "No token provided" 
      });
    }

    // Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    // Make sure decoded field name matches your JWT payload
    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Check if token is still valid (revoked token protection)
    if (user.activeToken !== token) {
      return res.status(401).json({
        status: false,
        message: "Session expired. Please log in again."
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (err) {
    console.error("Auth Error:", err);
    return res.status(401).json({
      status: false, 
      message: "Invalid or expired token"
    });
  }
};

exports.isAdmin = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Access denied! Admins only."
      });
    }

    next();
  } catch (error) {
    console.error("Admin Auth Error:", error);
    return res.status(500).json({
      status: false,
      message: "Authorization error"
    });
  }
};
