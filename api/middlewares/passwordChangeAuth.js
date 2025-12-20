const jwt = require("jsonwebtoken");
const User = require("../../models/user");

module.exports = async (req, res, next) => {
  try {
    const token = req.cookies.pwd_change_token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (decoded.purpose !== "PASSWORD_CHANGE") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(decoded.sub).select("tokenVersion");
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Session expired" });
    }

    req.user = { id: user._id };
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
