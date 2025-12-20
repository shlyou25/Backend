const jwt = require("jsonwebtoken");
const User = require('../../../models/user');

exports.authenticate = async (req, res) => {
  try {
    const token = req.cookies.token;   
    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await User.findById(decoded.sub)
      .select("name email role tokenVersion")
      .lean();

    if (!user) {
      return res.status(401).json({ authenticated: false });
    }

    // ✅ Now this works correctly
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ authenticated: false });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(401).json({ authenticated: false });
  }
};
