const jwt = require("jsonwebtoken");
const User = require("../../models/user");

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

exports.checkAccountLock=async(user)=> {
  if (
    user.accountLockedUntil &&
    user.accountLockedUntil.getTime() > Date.now()
  ) {
    return {
      locked: true,
      retryAfter: user.accountLockedUntil
    };
  }
  if (
    user.accountLockedUntil &&
    user.accountLockedUntil.getTime() <= Date.now()
  ) {
    user.failedAttempts = 0;
    user.accountLockedUntil = undefined;
    user.lockReason = undefined;
    await user.save();
  }

  return { locked: false };
}

exports.registerFailure=async(user, reason)=> {
  user.failedAttempts += 1;
  user.lastFailedAttemptAt = new Date();

  if (user.failedAttempts >= MAX_ATTEMPTS) {
    user.accountLockedUntil = new Date(
      Date.now() + LOCK_DURATION_MS
    );
    user.lockReason = reason;
  }

  await user.save();
}

exports.resetFailures=async(user)=> {
  user.failedAttempts = 0;
  user.accountLockedUntil = undefined;
  user.lockReason = undefined;
  await user.save();
}

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
