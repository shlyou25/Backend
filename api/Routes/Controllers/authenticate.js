const jwt = require("jsonwebtoken");
const userModel = require('../../../models/user');

exports.authenticate = async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ status: false, message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await userModel.findById(decoded.userId).select("-password");
    
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (user.activeToken !== token) {
      return res.status(401).json({ status: false, message: "Token revoked. Please login again." });
    }

    // ✅ Success case: respond directly
    return res.status(200).json({
      status: true,
      message: "Authenticated successfully",
      user,
    });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ status: false, message: "Invalid or expired token" });
  }
};
