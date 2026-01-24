const jwt = require("jsonwebtoken");
const User = require("../../models/user");

exports.optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.sub)
      .select("role tokenVersion isActive isEmailVerified email")
      .lean();
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      req.user = null;
      return next();
    }
    if (user.role !== "admin" && !user.isActive) {
      req.user = null;
      return next();
    }
    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    };

    return next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Optional auth error:", error.message);
    }
    req.user = null;
    return next();
  }
};

