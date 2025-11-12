const jwt = require("jsonwebtoken");

const userModel = require('../../models/user');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await userModel.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.user = user;
    next(); // or, if it’s your /authenticate route, just send response:
    // res.status(200).json({ valid: true, user });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};


