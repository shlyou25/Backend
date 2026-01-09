const jwt = require("jsonwebtoken");
const User = require("../../models/user");

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.sub)
      .select("role tokenVersion isActive")
      .lean();

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Unauthorized" });
    }
   
    if (user.role !== "admin" && !user.isActive) {
      return res.status(403).json({
        message: "Account is inactive. Please contact support."
      });
    }
    req.user = {
      id: decoded.sub,
      role: user.role
    };
    next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Auth error:", error.message);
    }
    return res.status(401).json({ message: "Unauthorized" });
  }
};

exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};
