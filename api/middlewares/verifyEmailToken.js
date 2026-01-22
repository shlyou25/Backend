const jwt = require("jsonwebtoken");

exports.verifyEmailToken = (req, res, next) => {
  try {
    const token = req.cookies.verify_token;
    console.log(token,"jhhhh");
    
    if (!token) {
      return res.status(401).json({
        code: "TOKEN_MISSING",
        message: "Verification token missing"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (decoded.purpose !== "EMAIL_VERIFY") {
      return res.status(403).json({
        code: "INVALID_TOKEN",
        message: "Invalid verification token"
      });
    }

    req.user = decoded;
    next();

  } catch (err) {
    return res.status(401).json({
      code: "TOKEN_EXPIRED",
      message: "Verification token expired"
    });
  }
};
