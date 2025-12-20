// middlewares/authenticate.js
const jwt = require("jsonwebtoken");
const User = require("../../models/user");

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY, {
      algorithms: ["HS256"]
    });

    const user = await User.findById(decoded.sub)
      .select("role tokenVersion")
      .lean();

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ authenticated: false });
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
    return res.status(401).json({ authenticated: false });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};
